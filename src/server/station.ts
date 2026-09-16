import type { Env } from "./env";
import { ok } from "./http";

export async function stationStatus(_request: Request, env: Env) {
  const active = await env.DB.prepare(
    "SELECT status,capture_status IS NULL AS cameraEnabled,created_at AS createdAt FROM examinations WHERE status IN ('queued','running') ORDER BY created_at ASC LIMIT 1",
  ).first<{
    status: "queued" | "running";
    cameraEnabled: number;
    createdAt: number;
  }>();

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
