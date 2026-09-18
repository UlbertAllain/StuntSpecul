import { z } from "zod";
import type { Env } from "./env";
import { ApiError, body, ok } from "./http";

const STATION_ID = "single-station";
const STATION_NAME = "StuntSpecula Station 01";

type ActiveStationExam = {
  id: string;
  ageMonths: number;
  sex: "male" | "female";
  status: "queued" | "running" | "completed";
  cameraEnabled: number;
  createdAt: number;
};

async function touchStation(env: Env) {
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO devices (id,name,active,last_seen,created_at) VALUES (?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET active=1,last_seen=excluded.last_seen,name=excluded.name",
  )
    .bind(STATION_ID, STATION_NAME, now, now)
    .run();
}

async function findActiveStationExam(env: Env) {
  return env.DB.prepare(
    "SELECT e.id,e.age_months AS ageMonths,e.sex,e.status,e.capture_status IS NULL AS cameraEnabled,e.created_at AS createdAt FROM examinations e WHERE e.status IN ('queued','running') OR (e.status='completed' AND EXISTS (SELECT 1 FROM examination_workflow ew WHERE ew.exam_id=e.id AND ew.finalized_at IS NULL)) ORDER BY e.created_at ASC LIMIT 1",
  ).first<ActiveStationExam>();
}

export async function stationStatus(_request: Request, env: Env) {
  await touchStation(env);
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
  await touchStation(env);
  const active = await findActiveStationExam(env);
  if (!active)
    throw new ApiError(409, "Belum ada pemeriksaan yang dikirim ke alat.");
  if (active.status === "completed")
    throw new ApiError(
      409,
      "Pemeriksaan sudah selesai. Menunggu konfirmasi petugas.",
    );

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
  await touchStation(env);
  const input = await body(request, completionSchema);
  const exam = await env.DB.prepare(
    "SELECT e.id,e.status FROM examinations e WHERE e.status='running' OR (e.status='completed' AND EXISTS (SELECT 1 FROM examination_workflow ew WHERE ew.exam_id=e.id AND ew.finalized_at IS NULL)) ORDER BY e.created_at DESC LIMIT 1",
  ).first<{ id: string; status: string }>();

  if (!exam) throw new ApiError(409, "Belum ada pemeriksaan aktif pada alat.");
  if (exam.status === "completed") return ok({ saved: true });

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
  await touchStation(env);
  const active = await env.DB.prepare(
    "SELECT id FROM examinations WHERE status IN ('queued','running') ORDER BY created_at ASC LIMIT 1",
  ).first<{ id: string }>();
  if (!active) return ok({ cancelled: false });

  await env.DB.prepare(
    "UPDATE examinations SET status='cancelled' WHERE id=? AND status IN ('queued','running')",
  )
    .bind(active.id)
    .run();
  return ok({ cancelled: true });
}
