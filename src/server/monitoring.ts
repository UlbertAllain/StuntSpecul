import type { Env } from "./env";
import { requireStaff } from "./auth";
import { ApiError, ok } from "./http";

export async function monitoringOverview(request: Request, env: Env) {
  await requireStaff(request, env);

  const url = new URL(request.url);
  const rawSince = url.searchParams.get("since");
  const since = rawSince ? Number(rawSince) : Date.now() - 24 * 60 * 60 * 1000;
  if (!Number.isInteger(since) || since < 0 || since > Date.now() + 60_000)
    throw new ApiError(422, "Rentang monitoring tidak valid.");

  const now = Date.now();
  const childCount = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM children",
  ).first<{ count: number }>();
  const today = await env.DB.prepare(
    "SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END),0) AS completed FROM examinations WHERE created_at>=?",
  )
    .bind(since)
    .first<{ total: number; completed: number }>();

  const activeExams = await env.DB.prepare(
    `SELECT e.id,
      CASE WHEN e.status='completed' THEN 'awaiting_confirmation' WHEN e.status='running' THEN 'running' ELSE 'ready' END AS status,
      c.name AS childName,
      e.age_months AS ageMonths,
      e.status AS examStatus,
      e.created_at AS createdAt,
      NULL AS connectedAt,
      CASE WHEN e.status='running' THEN e.created_at ELSE NULL END AS startedAt
     FROM examinations e
     JOIN children c ON c.id=e.child_id
     WHERE e.status IN ('queued','running') OR (e.status='completed' AND e.finalized_at IS NULL)
     ORDER BY e.created_at DESC LIMIT 5`,
  ).all();

  const waitingGuestSessions = await env.DB.prepare(
    `SELECT ss.id,ss.status,NULL AS childName,NULL AS ageMonths,NULL AS examStatus,
      ss.created_at AS createdAt,ss.connected_at AS connectedAt,ss.started_at AS startedAt
     FROM screening_sessions ss
     WHERE ss.expires_at>? AND ss.exam_id IS NULL
       AND ss.status IN ('waiting_parent','parent_connected')
     ORDER BY ss.created_at DESC LIMIT 5`,
  )
    .bind(now)
    .all();

  const active = [...activeExams.results, ...waitingGuestSessions.results]
    .sort(
      (a, b) =>
        Number((b as { createdAt: number }).createdAt) -
        Number((a as { createdAt: number }).createdAt),
    )
    .slice(0, 5);

  const recent = await env.DB.prepare(
    `SELECT e.id,c.name AS childName,e.age_months AS ageMonths,e.sex,e.status,e.height_cm AS heightCm,e.weight_kg AS weightKg,e.created_at AS createdAt,e.completed_at AS completedAt,e.finalized_at AS finalizedAt
     FROM examinations e
     JOIN children c ON c.id=e.child_id
     ORDER BY e.created_at DESC,e.id DESC LIMIT 8`,
  ).all();

  return ok({
    stats: {
      totalChildren: childCount?.count ?? 0,
      todayExaminations: today?.total ?? 0,
      todayCompleted: today?.completed ?? 0,
      activeSessions: active.length,
    },
    active,
    recent: recent.results,
  });
}
