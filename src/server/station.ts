import type { Env } from "./env";
import { ok } from "./http";

export async function stationStatus(_request: Request, env: Env) {
  const active = await env.DB.prepare(
    "SELECT id,age_months AS ageMonths,sex,status,capture_status IS NULL AS cameraEnabled,created_at AS createdAt FROM examinations WHERE status IN ('queued','running') ORDER BY created_at ASC LIMIT 1",
  ).first<{
    id: string;
    ageMonths: number;
    sex: "male" | "female";
    status: "queued" | "running";
    cameraEnabled: number;
    createdAt: number;
  }>();

  return ok({
    active: active
      ? {
          id: active.id,
          ageMonths: active.ageMonths,
          sex: active.sex,
          status: active.status,
          cameraEnabled: !!active.cameraEnabled,
          createdAt: active.createdAt,
        }
      : null,
  });
}
