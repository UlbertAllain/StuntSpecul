import { z } from "zod";
import type { Env } from "./env";
import { ApiError, body, ok } from "./http";

type ActiveStationExam = {
  id: string;
  ageMonths: number;
  sex: "male" | "female";
  status: "queued" | "running";
  cameraEnabled: number;
  createdAt: number;
};

async function findActiveStationExam(env: Env) {
  return env.DB.prepare(
    "SELECT id,age_months AS ageMonths,sex,status,capture_status IS NULL AS cameraEnabled,created_at AS createdAt FROM examinations WHERE status IN ('queued','running') ORDER BY created_at ASC LIMIT 1",
  ).first<ActiveStationExam>();
}

export async function stationStatus(_request: Request, env: Env) {
  const active = await findActiveStationExam(env);

  return ok({
    active: active
      ? {
          status: active.status,
          cameraEnabled: !!active.cameraEnabled,
          createdAt: active.createdAt,
        }
      : null,
  });
}

export async function claimStationExamination(_request: Request, env: Env) {
  const active = await findActiveStationExam(env);
  if (!active)
    throw new ApiError(409, "Belum ada pemeriksaan yang dikirim ke alat.");

  if (active.status === "queued") {
    const claimed = await env.DB.prepare(
      "UPDATE examinations SET status='running' WHERE id=? AND status='queued' RETURNING id",
    )
      .bind(active.id)
      .first();
    if (!claimed)
      throw new ApiError(409, "Pemeriksaan sudah berubah. Coba lagi.");
  }

  return ok({
    id: "station-active",
    ageMonths: active.ageMonths,
    sex: active.sex,
    status: "running" as const,
    cameraEnabled: !!active.cameraEnabled,
  });
}

const completionSchema = z
  .object({
    heightCm: z.number().finite().min(30).max(200).nullable(),
    weightKg: z.number().finite().min(1).max(100).nullable(),
    captureStatus: z.enum(["captured", "skipped", "failed"]),
  })
  .strict();

export async function completeStationExamination(request: Request, env: Env) {
  const input = await body(request, completionSchema);
  const exam = await env.DB.prepare(
    "SELECT id,status FROM examinations ORDER BY created_at DESC LIMIT 1",
  ).first<{ id: string; status: string }>();

  if (!exam) throw new ApiError(409, "Belum ada pemeriksaan aktif pada alat.");
  if (exam.status === "completed") return ok({ saved: true });
  if (exam.status !== "running")
    throw new ApiError(409, "Pemeriksaan belum dimulai atau sudah dibatalkan.");

  const bmi =
    input.heightCm && input.weightKg
      ? Number((input.weightKg / (input.heightCm / 100) ** 2).toFixed(1))
      : null;
  const completed = await env.DB.prepare(
    "UPDATE examinations SET status='completed',height_cm=?,weight_kg=?,bmi=?,capture_status=?,completed_at=? WHERE id=? AND status='running' RETURNING id",
  )
    .bind(
      input.heightCm,
      input.weightKg,
      bmi,
      input.captureStatus,
      Date.now(),
      exam.id,
    )
    .first();
  if (!completed)
    throw new ApiError(409, "Pemeriksaan sudah berubah. Hasil belum disimpan.");

  return ok({ saved: true });
}

export async function cancelStationExamination(_request: Request, env: Env) {
  const active = await findActiveStationExam(env);
  if (!active) return ok({ cancelled: false });

  await env.DB.prepare(
    "UPDATE examinations SET status='cancelled' WHERE id=? AND status IN ('queued','running')",
  )
    .bind(active.id)
    .run();
  return ok({ cancelled: true });
}
