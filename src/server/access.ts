import { z } from "zod";
import QRCode from "qrcode";
import type { Env } from "./env";
import { requireStaff } from "./auth";
import { ApiError, body, cookie, ok, sessionCookie } from "./http";
import { digest, rateLimit, requestKey, token, tokenSchema } from "./security";
import { getExamination } from "./screenings";
import type { ChatMessage } from "../lib/portal";

export const PARENT_COOKIE = "ss_parent";
export const PARENT_SECONDS = 2 * 60 * 60;
export async function createResultLink(request: Request, env: Env, id: string) {
  const actor = await requireStaff(request, env);
  const exam = await getExamination(env, id);
  if (exam.status !== "completed")
    throw new ApiError(
      409,
      "Tunggu pemeriksaan selesai sebelum membagikan hasil.",
    );
  const raw = token();
  const now = Date.now();
  const linkId = crypto.randomUUID();
  const expiresAt = now + 600_000;
  const url = `${env.APP_ORIGIN || new URL(request.url).origin}/hasil#${raw}`;
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE result_links SET revoked_at=? WHERE exam_id=? AND revoked_at IS NULL",
    ).bind(now, id),
    env.DB.prepare(
      "INSERT INTO result_links (id,token_hash,exam_id,created_by,expires_at,created_at) VALUES (?,?,?,?,?,?)",
    ).bind(linkId, await digest(raw), id, actor.id, expiresAt, now),
  ]);
  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 2,
    width: 280,
    errorCorrectionLevel: "M",
    color: { dark: "#203b57", light: "#ffffff" },
  });
  return ok({ url, qr, expiresAt });
}
export async function revokeResultLinks(
  request: Request,
  env: Env,
  id: string,
) {
  await requireStaff(request, env);
  await env.DB.prepare(
    "UPDATE result_links SET revoked_at=? WHERE exam_id=? AND revoked_at IS NULL",
  )
    .bind(Date.now(), id)
    .run();
  return ok();
}
export async function exchangeResultLink(request: Request, env: Env) {
  await rateLimit(env.DB, `exchange:${await requestKey(request)}`, 15, 900);
  const { code } = await body(request, z.object({ code: tokenSchema }));
  const raw = token();
  const hash = await digest(raw);
  const codeHash = await digest(code);
  const now = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO sessions (token_hash,kind,link_id,expires_at,created_at) SELECT ?,'parent',l.id,?,? FROM result_links l JOIN examinations e ON e.id=l.exam_id WHERE l.token_hash=? AND l.expires_at>? AND l.used_at IS NULL AND l.revoked_at IS NULL AND e.status='completed' RETURNING token_hash",
    ).bind(hash, now + PARENT_SECONDS * 1000, now, codeHash, now),
    env.DB.prepare(
      "UPDATE result_links SET used_at=? WHERE token_hash=? AND used_at IS NULL AND EXISTS (SELECT 1 FROM sessions WHERE token_hash=? AND link_id=result_links.id)",
    ).bind(now, codeHash, hash),
  ]);
  if (!results[0].results.length)
    throw new ApiError(
      410,
      "QR sudah digunakan atau kedaluwarsa. Minta QR baru kepada petugas.",
      "link_expired",
    );
  return ok({ expiresAt: now + PARENT_SECONDS * 1000 }, 200, {
    "Set-Cookie": sessionCookie(request, PARENT_COOKIE, raw, PARENT_SECONDS, env),
  });
}
export async function requireParent(request: Request, env: Env) {
  const raw = cookie(request, PARENT_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(raw))
    throw new ApiError(
      401,
      "Pindai QR dari petugas untuk membuka hasil.",
      "parent_unauthenticated",
    );
  const hash = await digest(raw);
  const session = await env.DB.prepare(
    "SELECT s.expires_at AS expiresAt,l.exam_id AS examId FROM sessions s JOIN result_links l ON l.id=s.link_id WHERE s.token_hash=? AND s.kind='parent' AND s.expires_at>? AND l.revoked_at IS NULL AND l.used_at IS NOT NULL",
  )
    .bind(hash, Date.now())
    .first<{ examId: string; expiresAt: number }>();
  if (!session)
    throw new ApiError(
      401,
      "Akses hasil sudah berakhir. Minta QR baru kepada petugas.",
      "parent_unauthenticated",
    );
  return { ...session, hash };
}
export async function parentMessages(env: Env, sessionHash: string) {
  return (
    await env.DB.prepare(
      "SELECT id,role,content,created_at AS createdAt FROM chat_messages WHERE session_hash=? ORDER BY created_at ASC,id ASC LIMIT 40",
    )
      .bind(sessionHash)
      .all<ChatMessage>()
  ).results;
}
export async function parentResult(request: Request, env: Env) {
  const session = await requireParent(request, env);
  const exam = await getExamination(env, session.examId);
  const {
    id,
    childName,
    ageMonths,
    sex,
    status,
    heightCm,
    weightKg,
    bmi,
    captureStatus,
    growthStatus,
    createdAt,
    completedAt,
  } = exam;
  return ok({
    result: {
      id,
      childName,
      ageMonths,
      sex,
      status,
      heightCm,
      weightKg,
      bmi,
      captureStatus,
      growthStatus,
      createdAt,
      completedAt,
    },
    expiresAt: session.expiresAt,
    aiAvailable: !!env.GEMINI_API_KEY && !!env.GEMINI_MODEL,
    messages: await parentMessages(env, session.hash),
  });
}
export async function parentLogout(request: Request, env: Env) {
  await env.DB.prepare(
    "DELETE FROM sessions WHERE token_hash=? AND kind='parent'",
  )
    .bind(await digest(cookie(request, PARENT_COOKIE)))
    .run();
  return ok(null, 200, {
    "Set-Cookie": sessionCookie(request, PARENT_COOKIE, "", 0, env),
  });
}
