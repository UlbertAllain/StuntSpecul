import { z } from "zod";
import { assessHeightForAge } from "../lib/growth";
import { ageInMonths, type Examination } from "../lib/portal";
import type { Env } from "./env";
import { requireStaff } from "./auth";
import { ApiError, body, ok } from "./http";
import { idSchema } from "./security";
import { findChild } from "./children";

// Keep historical device foreign keys intact; the single station needs no user setup.
const STATION_ID = "single-station";
const EXAM_SELECT = `SELECT e.id,e.child_id AS childId,c.name AS childName,c.code AS childCode,e.age_months AS ageMonths,e.sex,e.device_id AS deviceId,d.name AS deviceName,e.status,e.height_cm AS heightCm,e.weight_kg AS weightKg,e.bmi,e.capture_status AS captureStatus,e.growth_status AS growthStatus,e.created_at AS createdAt,e.completed_at AS completedAt FROM examinations e JOIN children c ON c.id=e.child_id JOIN devices d ON d.id=e.device_id`;
type StoredExamination = Omit<Examination, "heightForAgeZ" | "growthStatus"> & {
  growthStatus: string;
};

function withGrowthAssessment(exam: StoredExamination): Examination {
  const assessment = assessHeightForAge(
    exam.ageMonths,
    exam.sex,
    exam.heightCm,
  );
  return {
    ...exam,
    heightForAgeZ: assessment.heightForAgeZ,
    growthStatus: assessment.growthStatus,
  };
}

export async function listExaminations(request: Request, env: Env) {
  await requireStaff(request, env);
  const childId = new URL(request.url).searchParams.get("childId");
  const page = Number(new URL(request.url).searchParams.get("page") || "0");
  if (!Number.isInteger(page) || page < 0 || page > 100000)
    throw new ApiError(422, "Halaman tidak valid.");
  if (childId && !idSchema.safeParse(childId).success)
    throw new ApiError(422, "Profil tidak valid.");
  const statement = childId
    ? env.DB.prepare(
        `${EXAM_SELECT} WHERE e.child_id=? ORDER BY e.created_at DESC,e.id DESC LIMIT 50 OFFSET ?`,
      ).bind(childId, page * 50)
    : env.DB.prepare(
        `${EXAM_SELECT} ORDER BY e.created_at DESC,e.id DESC LIMIT 50 OFFSET ?`,
      ).bind(page * 50);
  const rows = (await statement.all<StoredExamination>()).results;
  return ok(rows.map(withGrowthAssessment));
}

export async function getExamination(
  env: Env,
  id: string,
): Promise<Examination> {
  const exam = await env.DB.prepare(`${EXAM_SELECT} WHERE e.id=?`)
    .bind(id)
    .first<StoredExamination>();
  if (!exam) throw new ApiError(404, "Pemeriksaan tidak ditemukan.");
  return withGrowthAssessment(exam);
}

export async function listParentExaminations(
  env: Env,
  parentId: string,
): Promise<Examination[]> {
  const rows = (
    await env.DB.prepare(
      `${EXAM_SELECT} JOIN parent_children pc ON pc.child_id=e.child_id WHERE pc.parent_id=? ORDER BY e.created_at DESC,e.id DESC LIMIT 100`,
    )
      .bind(parentId)
      .all<StoredExamination>()
  ).results;
  return rows.map(withGrowthAssessment);
}

export async function startExamination(request: Request, env: Env) {
  const actor = await requireStaff(request, env);
  const input = await body(
    request,
    z.object({
      childId: idSchema,
      cameraEnabled: z.boolean().default(true),
      canStand: z.literal(true, {
        errorMap: () => ({
          message: "Pastikan anak sudah bisa berdiri tanpa bantuan.",
        }),
      }),
    }),
  );
  const child = await findChild(env, input.childId);
  if (!child) throw new ApiError(422, "Pilih profil anak yang tersedia.");
  const age = ageInMonths(child.birthDate);
  if (age < 24 || age > 59)
    throw new ApiError(
      422,
      "Pemeriksaan berdiri ini untuk anak usia 24–59 bulan.",
    );
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO devices (id,name,active,created_at) VALUES (?,'Mirror',1,?) ON CONFLICT(id) DO NOTHING",
  )
    .bind(STATION_ID, Date.now())
    .run();
  // A single INSERT checks and reserves the station atomically, including legacy sessions.
  const created = await env.DB.prepare(
    "INSERT INTO examinations (id,child_id,staff_id,device_id,age_months,sex,status,capture_status,created_at) SELECT ?,?,?,?,?,?,'queued',?,? WHERE NOT EXISTS (SELECT 1 FROM examinations WHERE status IN ('queued','running')) RETURNING id",
  )
    .bind(
      id,
      child.id,
      actor.id,
      STATION_ID,
      age,
      child.sex,
      input.cameraEnabled ? null : "skipped",
      Date.now(),
    )
    .first();
  if (!created)
    throw new ApiError(
      409,
      "Masih ada pemeriksaan aktif. Lanjutkan atau batalkan melalui History sebelum memulai anak berikutnya.",
    );
  return ok({ id }, 201);
}

export async function cancelExamination(
  request: Request,
  env: Env,
  id: string,
) {
  await requireStaff(request, env);
  const changed = await env.DB.prepare(
    "UPDATE examinations SET status='cancelled' WHERE id=? AND status IN ('queued','running') RETURNING id",
  )
    .bind(id)
    .first();
  if (!changed) throw new ApiError(409, "Sesi sudah selesai atau dibatalkan.");
  return ok(changed);
}

export async function mirrorAssignment(request: Request, env: Env) {
  const actor = await requireStaff(request, env);
  const assignment = await env.DB.prepare(
    "SELECT id,age_months AS ageMonths,sex,status,capture_status IS NULL AS cameraEnabled FROM examinations WHERE staff_id=? AND status IN ('queued','running') LIMIT 1",
  )
    .bind(actor.id)
    .first();
  return ok({ assignment });
}

export async function claimExamination(request: Request, env: Env, id: string) {
  const actor = await requireStaff(request, env);
  const exam = await env.DB.prepare(
    "UPDATE examinations SET status='running' WHERE id=? AND staff_id=? AND status IN ('queued','running') RETURNING id,age_months AS ageMonths,sex,status,capture_status IS NULL AS cameraEnabled",
  )
    .bind(id, actor.id)
    .first();
  if (!exam) throw new ApiError(409, "Sesi tidak aktif. Hubungi petugas.");
  return ok(exam);
}

const completionSchema = z
  .object({
    heightCm: z.number().finite().min(30).max(200).nullable(),
    weightKg: z.number().finite().min(1).max(100).nullable(),
    captureStatus: z.enum(["captured", "skipped", "failed"]),
  })
  .strict();

export async function completeExamination(
  request: Request,
  env: Env,
  id: string,
) {
  const actor = await requireStaff(request, env);
  const input = await body(request, completionSchema);
  const prior = await env.DB.prepare(
    "SELECT id,status FROM examinations WHERE id=? AND staff_id=?",
  )
    .bind(id, actor.id)
    .first<{ id: string; status: string }>();
  if (!prior) throw new ApiError(404, "Pemeriksaan tidak ditemukan.");
  if (prior.status === "completed") return ok({ id, saved: true });
  const bmi =
    input.heightCm && input.weightKg
      ? Number((input.weightKg / (input.heightCm / 100) ** 2).toFixed(1))
      : null;
  const result = await env.DB.prepare(
    "UPDATE examinations SET status='completed',height_cm=?,weight_kg=?,bmi=?,capture_status=?,completed_at=? WHERE id=? AND staff_id=? AND status='running' RETURNING id",
  )
    .bind(
      input.heightCm,
      input.weightKg,
      bmi,
      input.captureStatus,
      Date.now(),
      id,
      actor.id,
    )
    .first();
  if (!result)
    throw new ApiError(409, "Sesi sudah dibatalkan. Hasil tidak disimpan.");
  return ok({ id, saved: true });
}

export async function cancelFromMirror(request: Request, env: Env, id: string) {
  const actor = await requireStaff(request, env);
  await env.DB.prepare(
    "UPDATE examinations SET status='cancelled' WHERE id=? AND staff_id=? AND status IN ('queued','running')",
  )
    .bind(id, actor.id)
    .run();
  return ok();
}
