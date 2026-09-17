import { assessHeightForAge } from "../lib/growth";
import type { Env } from "./env";
import { requireStaff } from "./auth";
import { ApiError, ok } from "./http";

const STATION_ID = "single-station";
const STATION_NAME = "StuntSpecula Station 01";
const ONLINE_WINDOW_MS = 15_000;
const DAY = 24 * 60 * 60 * 1000;

export async function monitoringOverview(request: Request, env: Env) {
  await requireStaff(request, env);

  const url = new URL(request.url);
  const rawSince = url.searchParams.get("since");
  const since = rawSince ? Number(rawSince) : Date.now() - DAY;
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
     WHERE e.status IN ('queued','running') OR (e.status='completed' AND EXISTS (SELECT 1 FROM examination_workflow ew WHERE ew.exam_id=e.id AND ew.finalized_at IS NULL))
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
    `SELECT e.id,c.name AS childName,e.age_months AS ageMonths,e.sex,e.status,e.height_cm AS heightCm,e.weight_kg AS weightKg,e.created_at AS createdAt,e.completed_at AS completedAt,
      CASE WHEN ew.exam_id IS NULL THEN e.completed_at ELSE ew.finalized_at END AS finalizedAt
     FROM examinations e
     JOIN children c ON c.id=e.child_id
     LEFT JOIN examination_workflow ew ON ew.exam_id=e.id
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

export async function deviceMonitoring(request: Request, env: Env) {
  await requireStaff(request, env);
  const now = Date.now();
  const stored = await env.DB.prepare(
    "SELECT id,name,active,last_seen AS lastSeen,created_at AS createdAt FROM devices WHERE id=?",
  )
    .bind(STATION_ID)
    .first<{
      id: string;
      name: string;
      active: number;
      lastSeen: number | null;
      createdAt: number;
    }>();

  const activeExam = await env.DB.prepare(
    `SELECT e.status,e.created_at AS createdAt,c.name AS childName
     FROM examinations e
     JOIN children c ON c.id=e.child_id
     WHERE e.device_id=? AND (
       e.status IN ('queued','running') OR
       (e.status='completed' AND EXISTS (
         SELECT 1 FROM examination_workflow ew
         WHERE ew.exam_id=e.id AND ew.finalized_at IS NULL
       ))
     )
     ORDER BY e.created_at ASC LIMIT 1`,
  )
    .bind(STATION_ID)
    .first<{
      status: "queued" | "running" | "completed";
      createdAt: number;
      childName: string;
    }>();

  const lastSeen = stored?.lastSeen ?? null;
  const online =
    !!stored?.active && lastSeen !== null && now - lastSeen <= ONLINE_WINDOW_MS;

  return ok({
    devices: [
      {
        id: STATION_ID,
        name: stored?.name || STATION_NAME,
        online,
        lastSeen,
        status: !online
          ? "offline"
          : activeExam?.status === "running"
            ? "in_use"
            : activeExam
              ? "assigned"
              : "ready",
        examination: activeExam || null,
        checks: {
          application: online ? "normal" : "offline",
          heightSensor: "pending_hardware",
          weightSensor: "pending_hardware",
          camera: online ? "app_ready" : "offline",
        },
      },
    ],
    generatedAt: now,
  });
}

type InsightExam = {
  ageMonths: number;
  sex: "male" | "female";
  heightCm: number | null;
  createdAt: number;
};

export async function adminInsights(request: Request, env: Env) {
  const actor = await requireStaff(request, env);
  if (actor.role !== "admin")
    throw new ApiError(403, "Insight hanya tersedia untuk pengelola.");

  const now = Date.now();
  const currentStart = now - 30 * DAY;
  const previousStart = now - 60 * DAY;

  const activity = await env.DB.prepare(
    `SELECT
      COALESCE(SUM(CASE WHEN created_at>=? THEN 1 ELSE 0 END),0) AS currentTotal,
      COALESCE(SUM(CASE WHEN created_at>=? AND created_at<? THEN 1 ELSE 0 END),0) AS previousTotal,
      COALESCE(SUM(CASE WHEN created_at>=? AND status='completed' THEN 1 ELSE 0 END),0) AS currentCompleted
     FROM examinations
     WHERE created_at>=?`,
  )
    .bind(
      currentStart,
      previousStart,
      currentStart,
      currentStart,
      previousStart,
    )
    .first<{
      currentTotal: number;
      previousTotal: number;
      currentCompleted: number;
    }>();

  const exams = (
    await env.DB.prepare(
      `SELECT age_months AS ageMonths,sex,height_cm AS heightCm,created_at AS createdAt
       FROM examinations
       WHERE status='completed' AND created_at>=?`,
    )
      .bind(previousStart)
      .all<InsightExam>()
  ).results;

  const growth = {
    normal: 0,
    watch: 0,
    stunted: 0,
    severe: 0,
    unavailable: 0,
  };
  const ageBands = { "24-35": 0, "36-47": 0, "48-59": 0 };
  let currentRisk = 0;
  let previousRisk = 0;

  for (const exam of exams) {
    const result = assessHeightForAge(exam.ageMonths, exam.sex, exam.heightCm);
    const isCurrent = exam.createdAt >= currentStart;
    if (isCurrent) {
      if (exam.ageMonths <= 35) ageBands["24-35"] += 1;
      else if (exam.ageMonths <= 47) ageBands["36-47"] += 1;
      else ageBands["48-59"] += 1;

      if (result.growthStatus === "within_range") growth.normal += 1;
      else if (result.growthStatus === "monitor") growth.watch += 1;
      else if (result.growthStatus === "stunted") growth.stunted += 1;
      else if (result.growthStatus === "severely_stunted") growth.severe += 1;
      else growth.unavailable += 1;
    }

    if (
      result.growthStatus === "stunted" ||
      result.growthStatus === "severely_stunted"
    ) {
      if (isCurrent) currentRisk += 1;
      else previousRisk += 1;
    }
  }

  const parentCount = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM parent_accounts WHERE active=1",
  ).first<{ count: number }>();

  return ok({
    periodDays: 30,
    activity: {
      examinations: activity?.currentTotal ?? 0,
      completed: activity?.currentCompleted ?? 0,
      previousExaminations: activity?.previousTotal ?? 0,
      activeParents: parentCount?.count ?? 0,
    },
    growth,
    ageBands,
    attention: {
      currentRisk,
      previousRisk,
      change: currentRisk - previousRisk,
    },
  });
}
