import { z } from "zod";
import type { Env } from "./env";
import { ApiError, body, cookie, ok, sessionCookie } from "./http";
import {
  digest,
  emailSchema,
  hashPassword,
  nameSchema,
  passwordSchema,
  rateLimit,
  requestKey,
  token,
  verifyPassword,
} from "./security";
import { ageInMonths, type ChatMessage, type Examination } from "../lib/portal";
import { getExamination, listParentExaminations } from "./screenings";
import { geminiExplainer } from "./gemini";

const PARENT_ACCOUNT_COOKIE = "ss_parent_account";
const PARENT_ACCOUNT_SECONDS = 30 * 24 * 60 * 60;

type ParentAccount = {
  id: string;
  name: string;
  email: string;
  active: number;
};

type ParentSession = ParentAccount & { sessionHash: string };

const childRegistrationSchema = z.object({
  name: nameSchema,
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(["male", "female"]),
});

const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    child: childRegistrationSchema,
  })
  .strict();

async function createParentSession(
  request: Request,
  env: Env,
  parent: ParentAccount,
) {
  const raw = token();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO parent_account_sessions (token_hash,parent_id,expires_at,created_at) VALUES (?,?,?,?)",
  )
    .bind(
      await digest(raw),
      parent.id,
      now + PARENT_ACCOUNT_SECONDS * 1000,
      now,
    )
    .run();
  return ok({ id: parent.id, name: parent.name, email: parent.email }, 200, {
    "Set-Cookie": sessionCookie(
      request,
      PARENT_ACCOUNT_COOKIE,
      raw,
      PARENT_ACCOUNT_SECONDS,
      env,
    ),
  });
}

export async function requireParentAccount(
  request: Request,
  env: Env,
): Promise<ParentSession> {
  const raw = cookie(request, PARENT_ACCOUNT_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(raw))
    throw new ApiError(
      401,
      "Silakan masuk sebagai orang tua.",
      "unauthenticated",
    );
  const hash = await digest(raw);
  const parent = await env.DB.prepare(
    "SELECT p.id,p.name,p.email,p.active,s.token_hash AS sessionHash FROM parent_accounts p JOIN parent_account_sessions s ON s.parent_id=p.id WHERE s.token_hash=? AND s.expires_at>? AND p.active=1",
  )
    .bind(hash, Date.now())
    .first<ParentSession>();
  if (!parent)
    throw new ApiError(
      401,
      "Sesi berakhir. Silakan masuk kembali.",
      "unauthenticated",
    );
  return parent;
}

export async function registerParent(request: Request, env: Env) {
  await rateLimit(
    env.DB,
    `parent-register:${await requestKey(request)}`,
    6,
    3600,
  );
  const input = await body(request, registerSchema);
  let months: number;
  try {
    months = ageInMonths(input.child.birthDate);
  } catch {
    throw new ApiError(422, "Tanggal lahir anak tidak valid.");
  }
  if (months < 0 || months > 59)
    throw new ApiError(
      422,
      "Profil pertumbuhan ditujukan untuk anak usia 0–59 bulan.",
    );

  const exists = await env.DB.prepare(
    "SELECT id FROM parent_accounts WHERE email=?",
  )
    .bind(input.email)
    .first();
  if (exists) throw new ApiError(409, "Email sudah terdaftar. Silakan masuk.");

  const parentId = crypto.randomUUID();
  const childId = crypto.randomUUID();
  const childCode = `ST-${childId.slice(0, 8).toUpperCase()}`;
  const now = Date.now();
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO parent_accounts (id,name,email,password_hash,active,created_at) VALUES (?,?,?,?,1,?)",
      ).bind(
        parentId,
        input.name,
        input.email,
        await hashPassword(input.password),
        now,
      ),
      env.DB.prepare(
        "INSERT INTO children (id,code,name,birth_date,sex,guardian,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        childId,
        childCode,
        input.child.name,
        input.child.birthDate,
        input.child.sex,
        input.name,
        now,
      ),
      env.DB.prepare(
        "INSERT INTO parent_children (parent_id,child_id,created_at) VALUES (?,?,?)",
      ).bind(parentId, childId, now),
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE"))
      throw new ApiError(409, "Email atau profil sudah terdaftar.");
    throw error;
  }

  return createParentSession(request, env, {
    id: parentId,
    name: input.name,
    email: input.email,
    active: 1,
  });
}

export async function loginParent(request: Request, env: Env) {
  await rateLimit(env.DB, `parent-login:${await requestKey(request)}`, 12, 900);
  const input = await body(
    request,
    z.object({ email: emailSchema, password: passwordSchema }),
  );
  const parent = await env.DB.prepare(
    "SELECT id,name,email,active,password_hash AS passwordHash FROM parent_accounts WHERE email=?",
  )
    .bind(input.email)
    .first<ParentAccount & { passwordHash: string }>();
  const valid = await verifyPassword(
    input.password,
    parent?.passwordHash ||
      "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxDwbuCVXBQ0DPGCXRWrTjfRBha",
  );
  if (!parent || !valid || !parent.active)
    throw new ApiError(401, "Email atau password tidak sesuai.");
  return createParentSession(request, env, parent);
}

export async function logoutParent(request: Request, env: Env) {
  const raw = cookie(request, PARENT_ACCOUNT_COOKIE);
  if (/^[a-f0-9]{64}$/.test(raw))
    await env.DB.prepare(
      "DELETE FROM parent_account_sessions WHERE token_hash=?",
    )
      .bind(await digest(raw))
      .run();
  return ok(null, 200, {
    "Set-Cookie": sessionCookie(request, PARENT_ACCOUNT_COOKIE, "", 0, env),
  });
}

export async function parentAccountView(request: Request, env: Env) {
  const parent = await requireParentAccount(request, env);
  const children = (
    await env.DB.prepare(
      "SELECT c.id,c.code,c.name,c.birth_date AS birthDate,c.sex,c.guardian,c.created_at AS createdAt FROM children c JOIN parent_children pc ON pc.child_id=c.id WHERE pc.parent_id=? ORDER BY c.created_at ASC",
    )
      .bind(parent.id)
      .all()
  ).results;
  const exams = await listParentExaminations(env, parent.id);

  return ok({
    parent: { id: parent.id, name: parent.name, email: parent.email },
    children,
    examinations: exams,
    aiAvailable: !!env.GEMINI_API_KEY && !!env.GEMINI_MODEL,
  });
}

async function requireOwnedExam(
  env: Env,
  parentId: string,
  examId: string,
): Promise<Examination> {
  const owned = await env.DB.prepare(
    "SELECT e.id FROM examinations e JOIN parent_children pc ON pc.child_id=e.child_id WHERE e.id=? AND pc.parent_id=? AND e.status='completed'",
  )
    .bind(examId, parentId)
    .first<{ id: string }>();
  if (!owned) throw new ApiError(404, "Hasil pemeriksaan tidak ditemukan.");
  return getExamination(env, owned.id);
}

export async function parentAccountChat(request: Request, env: Env) {
  const parent = await requireParentAccount(request, env);
  const input = await body(
    request,
    z.object({
      examId: z.string().uuid(),
      message: z.string().trim().min(1).max(1500),
      consent: z.literal(true),
    }),
  );
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL)
    throw new ApiError(
      503,
      "Asisten sedang tidak tersedia. Hasil pemeriksaan tetap dapat dilihat.",
      "ai_not_configured",
    );

  await rateLimit(
    env.DB,
    `parent-account-chat:${parent.sessionHash}`,
    20,
    7200,
  );
  await rateLimit(
    env.DB,
    `parent-account-chat-minute:${parent.sessionHash}`,
    4,
    60,
  );
  const exam = await requireOwnedExam(env, parent.id, input.examId);
  const history = (
    await env.DB.prepare(
      "SELECT id,role,content,created_at AS createdAt FROM parent_account_chat_messages WHERE parent_id=? AND exam_id=? ORDER BY created_at ASC LIMIT 40",
    )
      .bind(parent.id, exam.id)
      .all<ChatMessage>()
  ).results;

  let answer: string;
  try {
    answer = await geminiExplainer(env).explain(exam, history, input.message);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      503,
      "Asisten belum merespons. Silakan coba lagi.",
      "ai_timeout",
    );
  }

  await requireParentAccount(request, env);
  const now = Date.now();
  const user: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: input.message,
    createdAt: now,
  };
  const assistant: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: answer,
    createdAt: now + 1,
  };
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO parent_account_chat_messages (id,parent_id,exam_id,role,content,created_at) VALUES (?,?,?,?,?,?)",
    ).bind(
      user.id,
      parent.id,
      exam.id,
      user.role,
      user.content,
      user.createdAt,
    ),
    env.DB.prepare(
      "INSERT INTO parent_account_chat_messages (id,parent_id,exam_id,role,content,created_at) VALUES (?,?,?,?,?,?)",
    ).bind(
      assistant.id,
      parent.id,
      exam.id,
      assistant.role,
      assistant.content,
      assistant.createdAt,
    ),
  ]);
  return ok({ user, assistant });
}

export async function parentAccountMessages(request: Request, env: Env) {
  const parent = await requireParentAccount(request, env);
  const examId = new URL(request.url).searchParams.get("examId") || "";
  const exam = await requireOwnedExam(env, parent.id, examId);
  return ok(
    (
      await env.DB.prepare(
        "SELECT id,role,content,created_at AS createdAt FROM parent_account_chat_messages WHERE parent_id=? AND exam_id=? ORDER BY created_at ASC LIMIT 40",
      )
        .bind(parent.id, exam.id)
        .all<ChatMessage>()
    ).results,
  );
}
