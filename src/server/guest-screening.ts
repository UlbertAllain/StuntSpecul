import QRCode from "qrcode";
import { z } from "zod";
import { ageInMonths, type MirrorAssignment } from "../lib/portal";
import { PARENT_COOKIE, PARENT_SECONDS } from "./access";
import { SYSTEM_SCREENING_STAFF_ID } from "./auth";
import type { Env } from "./env";
import { ApiError, body, cookie, ok, sessionCookie } from "./http";
import {
  digest,
  nameSchema,
  rateLimit,
  requestKey,
  token,
  tokenSchema,
} from "./security";

const MIRROR_COOKIE = "ss_screening_mirror";
const PARENT_SCREENING_COOKIE = "ss_screening_parent";
const SCREENING_SECONDS = 30 * 60;
const STATION_ID = "single-station";

type ScreeningStatus =
  | "waiting_parent"
  | "parent_connected"
  | "ready"
  | "running"
  | "completed"
  | "cancelled";

type ScreeningSession = {
  id: string;
  status: ScreeningStatus;
  childId: string | null;
  examId: string | null;
  expiresAt: number;
};

const parentProfileSchema = z
  .object({
    name: nameSchema,
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sex: z.enum(["male", "female"]),
    guardian: z.string().trim().max(80).optional().default(""),
  })
  .strict();

const completionSchema = z
  .object({
    heightCm: z.number().finite().min(30).max(200).nullable(),
    weightKg: z.number().finite().min(1).max(100).nullable(),
    captureStatus: z.enum(["captured", "skipped", "failed"]),
  })
  .strict();

async function screeningByToken(
  env: Env,
  column: "mirror_token_hash" | "parent_token_hash",
  raw: string,
) {
  if (!/^[a-f0-9]{64}$/.test(raw)) return null;
  return env.DB.prepare(
    `SELECT id,status,child_id AS childId,exam_id AS examId,expires_at AS expiresAt FROM screening_sessions WHERE ${column}=? AND expires_at>?`,
  )
    .bind(await digest(raw), Date.now())
    .first<ScreeningSession>();
}

async function requireMirror(request: Request, env: Env) {
  const session = await screeningByToken(
    env,
    "mirror_token_hash",
    cookie(request, MIRROR_COOKIE),
  );
  if (!session)
    throw new ApiError(401, "Mulai sesi pemeriksaan baru.", "screening_missing");
  return session;
}

async function requireScreeningParent(request: Request, env: Env) {
  const session = await screeningByToken(
    env,
    "parent_token_hash",
    cookie(request, PARENT_SCREENING_COOKIE),
  );
  if (!session)
    throw new ApiError(
      401,
      "Sesi pemeriksaan sudah berakhir. Scan QR pada alat kembali.",
      "screening_parent_missing",
    );
  return session;
}

async function assignment(env: Env, examId: string) {
  return env.DB.prepare(
    "SELECT id,age_months AS ageMonths,sex,status,capture_status IS NULL AS cameraEnabled FROM examinations WHERE id=? AND status IN ('queued','running')",
  )
    .bind(examId)
    .first<MirrorAssignment>();
}

export async function createScreeningSession(request: Request, env: Env) {
  await rateLimit(env.DB, `screening-create:${await requestKey(request)}`, 20, 900);
  const active = await env.DB.prepare(
    "SELECT id FROM screening_sessions WHERE expires_at>? AND status IN ('waiting_parent','parent_connected','ready','running') LIMIT 1",
  )
    .bind(Date.now())
    .first();
  if (active)
    throw new ApiError(
      409,
      "Masih ada sesi pemeriksaan aktif. Selesaikan atau batalkan sesi tersebut terlebih dahulu.",
    );

  const mirrorRaw = token();
  const parentRaw = token();
  const now = Date.now();
  const expiresAt = now + SCREENING_SECONDS * 1000;
  const id = crypto.randomUUID();
  const url = `${env.APP_ORIGIN || new URL(request.url).origin}/mulai#${parentRaw}`;

  await env.DB.prepare(
    "INSERT INTO screening_sessions (id,mirror_token_hash,parent_token_hash,status,expires_at,created_at) VALUES (?,?,?,'waiting_parent',?,?)",
  )
    .bind(id, await digest(mirrorRaw), await digest(parentRaw), expiresAt, now)
    .run();

  const qr = await QRCode.toString(url, {
    type: "svg",
    margin: 2,
    width: 320,
    errorCorrectionLevel: "M",
    color: { dark: "#203b57", light: "#ffffff" },
  });

  return ok(
    { id, status: "waiting_parent", url, qr, expiresAt },
    201,
    {
      "Set-Cookie": sessionCookie(
        request,
        MIRROR_COOKIE,
        mirrorRaw,
        SCREENING_SECONDS,
        env,
      ),
    },
  );
}

export async function mirrorState(request: Request, env: Env) {
  const session = await requireMirror(request, env);
  const pending = session.examId ? await assignment(env, session.examId) : null;
  return ok({
    id: session.id,
    status: session.status,
    expiresAt: session.expiresAt,
    assignment: pending,
  });
}

export async function exchangeParentScreening(request: Request, env: Env) {
  await rateLimit(env.DB, `screening-parent:${await requestKey(request)}`, 20, 900);
  const { code } = await body(request, z.object({ code: tokenSchema }));
  const hash = await digest(code);
  const now = Date.now();
  const session = await env.DB.prepare(
    "UPDATE screening_sessions SET status=CASE WHEN status='waiting_parent' THEN 'parent_connected' ELSE status END,connected_at=COALESCE(connected_at,?) WHERE parent_token_hash=? AND expires_at>? AND status IN ('waiting_parent','parent_connected','ready','running','completed') RETURNING id,status,expires_at AS expiresAt",
  )
    .bind(now, hash, now)
    .first<{ id: string; status: ScreeningStatus; expiresAt: number }>();
  if (!session)
    throw new ApiError(
      410,
      "QR pemeriksaan sudah tidak berlaku. Silakan scan QR baru pada alat.",
      "screening_expired",
    );
  return ok(session, 200, {
    "Set-Cookie": sessionCookie(
      request,
      PARENT_SCREENING_COOKIE,
      code,
      SCREENING_SECONDS,
      env,
    ),
  });
}

export async function parentScreeningState(request: Request, env: Env) {
  const session = await requireScreeningParent(request, env);
  let childName: string | null = null;
  if (session.childId) {
    childName =
      (
        await env.DB.prepare("SELECT name FROM children WHERE id=?")
          .bind(session.childId)
          .first<{ name: string }>()
      )?.name ?? null;
  }
  return ok({
    id: session.id,
    status: session.status,
    childName,
    resultReady: session.status === "completed",
    expiresAt: session.expiresAt,
  });
}

export async function submitParentProfile(request: Request, env: Env) {
  const session = await requireScreeningParent(request, env);
  if (!["waiting_parent", "parent_connected"].includes(session.status))
    throw new ApiError(409, "Data anak untuk sesi ini sudah tersimpan.");

  const input = await body(request, parentProfileSchema);
  let ageMonths: number;
  try {
    ageMonths = ageInMonths(input.birthDate);
  } catch {
    throw new ApiError(422, "Tanggal lahir tidak valid.");
  }
  if (ageMonths < 0 || ageMonths > 59)
    throw new ApiError(
      422,
      "Pemeriksaan saat ini ditujukan untuk anak usia 0–59 bulan.",
    );

  const active = await env.DB.prepare(
    "SELECT id FROM examinations WHERE status IN ('queued','running') LIMIT 1",
  ).first();
  if (active)
    throw new ApiError(
      409,
      "Alat sedang digunakan untuk pemeriksaan lain. Silakan tunggu sebentar.",
    );

  const now = Date.now();
  const childId = crypto.randomUUID();
  const examId = crypto.randomUUID();
  const childCode = `ST-${childId.slice(0, 8).toUpperCase()}`;

  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO children (id,code,name,birth_date,sex,guardian,created_at) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        childId,
        childCode,
        input.name,
        input.birthDate,
        input.sex,
        input.guardian ?? "",
        now,
      ),
      env.DB.prepare(
        "INSERT INTO devices (id,name,active,created_at) VALUES (?,'Mirror',1,?) ON CONFLICT(id) DO NOTHING",
      ).bind(STATION_ID, now),
      env.DB.prepare(
        "INSERT INTO examinations (id,child_id,staff_id,device_id,age_months,sex,status,capture_status,created_at) VALUES (?,?,?,?,?,?,'queued',NULL,?)",
      ).bind(
        examId,
        childId,
        SYSTEM_SCREENING_STAFF_ID,
        STATION_ID,
        ageMonths,
        input.sex,
        now,
      ),
      env.DB.prepare(
        "UPDATE screening_sessions SET child_id=?,exam_id=?,status='ready' WHERE id=? AND status IN ('waiting_parent','parent_connected')",
      ).bind(childId, examId, session.id),
    ]);
  } catch (error) {
    if (String(error).includes("one_active_exam_per_device"))
      throw new ApiError(
        409,
        "Alat sedang digunakan untuk pemeriksaan lain. Silakan tunggu sebentar.",
      );
    throw error;
  }

  return ok({ id: session.id, status: "ready", childName: input.name }, 201);
}

export async function claimGuestExamination(request: Request, env: Env) {
  const session = await requireMirror(request, env);
  if (!session.examId)
    throw new ApiError(409, "Data si kecil belum selesai diisi.");
  if (!["ready", "running"].includes(session.status))
    throw new ApiError(409, "Sesi belum siap untuk dimulai.");

  const exam = await env.DB.prepare(
    "UPDATE examinations SET status='running' WHERE id=? AND status IN ('queued','running') RETURNING id,age_months AS ageMonths,sex,status,capture_status IS NULL AS cameraEnabled",
  )
    .bind(session.examId)
    .first<MirrorAssignment>();
  if (!exam) throw new ApiError(409, "Pemeriksaan sudah tidak aktif.");

  await env.DB.prepare(
    "UPDATE screening_sessions SET status='running',started_at=COALESCE(started_at,?) WHERE id=?",
  )
    .bind(Date.now(), session.id)
    .run();
  return ok(exam);
}

export async function completeGuestExamination(request: Request, env: Env) {
  const session = await requireMirror(request, env);
  if (!session.examId) throw new ApiError(404, "Pemeriksaan tidak ditemukan.");
  const input = await body(request, completionSchema);
  const current = await env.DB.prepare(
    "SELECT status FROM examinations WHERE id=?",
  )
    .bind(session.examId)
    .first<{ status: string }>();
  if (!current) throw new ApiError(404, "Pemeriksaan tidak ditemukan.");
  if (current.status === "completed") return ok({ id: session.examId, saved: true });

  const bmi =
    input.heightCm && input.weightKg
      ? Number((input.weightKg / (input.heightCm / 100) ** 2).toFixed(1))
      : null;
  const now = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(
      "UPDATE examinations SET status='completed',height_cm=?,weight_kg=?,bmi=?,capture_status=?,completed_at=? WHERE id=? AND status='running' RETURNING id",
    ).bind(
      input.heightCm,
      input.weightKg,
      bmi,
      input.captureStatus,
      now,
      session.examId,
    ),
    env.DB.prepare(
      "UPDATE screening_sessions SET status='completed',completed_at=? WHERE id=? AND status='running'",
    ).bind(now, session.id),
  ]);
  if (!results[0].results.length)
    throw new ApiError(409, "Pemeriksaan sudah dibatalkan.");
  return ok({ id: session.examId, saved: true });
}

export async function cancelGuestExamination(request: Request, env: Env) {
  const session = await requireMirror(request, env);
  const statements = [
    env.DB.prepare(
      "UPDATE screening_sessions SET status='cancelled' WHERE id=? AND status<>'completed'",
    ).bind(session.id),
  ];
  if (session.examId) {
    statements.unshift(
      env.DB.prepare(
        "UPDATE examinations SET status='cancelled' WHERE id=? AND status IN ('queued','running')",
      ).bind(session.examId),
    );
  }
  await env.DB.batch(statements);
  return ok();
}

export async function finalizeParentResult(request: Request, env: Env) {
  const screening = await requireScreeningParent(request, env);
  if (screening.status !== "completed" || !screening.examId)
    throw new ApiError(409, "Hasil pemeriksaan belum siap.");

  const now = Date.now();
  const raw = token();
  const linkToken = token();
  const linkId = crypto.randomUUID();
  const expiresAt = now + PARENT_SECONDS * 1000;
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO result_links (id,token_hash,exam_id,created_by,expires_at,used_at,created_at) VALUES (?,?,?,?,?,?,?)",
    ).bind(
      linkId,
      await digest(linkToken),
      screening.examId,
      SYSTEM_SCREENING_STAFF_ID,
      expiresAt,
      now,
      now,
    ),
    env.DB.prepare(
      "INSERT INTO sessions (token_hash,kind,link_id,expires_at,created_at) VALUES (?,'parent',?,?,?)",
    ).bind(await digest(raw), linkId, expiresAt, now),
  ]);

  return ok({ ready: true, expiresAt }, 200, {
    "Set-Cookie": sessionCookie(
      request,
      PARENT_COOKIE,
      raw,
      PARENT_SECONDS,
      env,
    ),
  });
}
