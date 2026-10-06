import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { z } from "zod";
import type {
  BlogPost,
  BlogPostInput,
  BlogPostSummary,
  ChildProfile,
  ChatMessage,
  Examination,
  Staff,
} from "../lib/portal";
import {
  ageInMonths,
  blogInputSchema,
  childProfileSchema,
} from "../lib/portal";
import { STARTER_BLOGS } from "../lib/blog-seeds";
import { assessAnthropometry } from "../lib/anthropometry";
import { linearGrowthIndicator } from "../lib/growth";
import type { VisualAnalysis } from "../lib/screening";
import {
  growthRecommendationsFor,
  type GrowthRecommendations,
} from "../lib/growth-recommendations";
import type { Env } from "./env";
import {
  FirestoreError,
  type FirestoreDoc,
  type FirestoreRest,
  type FirestoreWrite,
} from "./firestore";
import { ApiError, body, cookie, ok, sessionCookie } from "./http";
import { requireIotApiKey } from "./iot-auth";
import {
  digest,
  emailSchema,
  hashPassword,
  idSchema,
  loginPasswordSchema,
  nameSchema,
  parentPasswordSchema,
  passwordSchema,
  requestKey,
  token,
  verifyPassword,
} from "./security";
import { geminiExplainer } from "./gemini";

const STAFF_COOKIE = "ss_staff";
const PARENT_COOKIE = "ss_parent_account";
const STAFF_SECONDS = 8 * 60 * 60;
const PARENT_SECONDS = 30 * 24 * 60 * 60;
const STATION_ID = "single-station";
const STATION_NAME = "StuntSpecula Station 01";
const SYSTEM_SCREENING_STAFF_ID = "guest-screening-system";
const DAY = 24 * 60 * 60 * 1000;
const ONLINE_WINDOW_MS = 8_000;
const HEARTBEAT_PERSIST_MS = 6_000;
let heartbeatPersistedAt = 0;
let heartbeatStateSignature = "";
const GOOGLE_OAUTH_STATE_COOKIE = "ss_google_oauth";
const GOOGLE_OAUTH_INTENT_COOKIE = "ss_google_oauth_intent";
const GOOGLE_REGISTER_COOKIE = "ss_google_register";
const GOOGLE_OAUTH_SECONDS = 10 * 60;
const DUMMY_PASSWORD_HASH =
  "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxDwbuCVXBQ0DPGCXRWrTjfRBha";

type StaffRecord = {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "staff";
  active: boolean;
  createdAt: number;
};

type ParentRecord = {
  name: string;
  email: string;
  passwordHash: string | null;
  avatarUrl: string | null;
  avatarPublicId: string | null;
  active: boolean;
  createdAt: number;
};

type ChildRecord = ChildProfile & {
  parentId: string | null;
  latestFacePhotoPublicId?: string | null;
};

type ExamRecord = {
  childId: string;
  childName: string;
  childCode: string;
  parentId: string | null;
  staffId: string;
  ageMonths: number;
  sex: "male" | "female";
  deviceId: string;
  deviceName: string;
  measurementMode?: "device" | "manual_infant" | "manual";
  status: "queued" | "running" | "completed" | "cancelled";
  cameraEnabled: boolean;
  stationStep?:
    | "camera"
    | "prepare"
    | "height"
    | "weight"
    | "analysis"
    | "result"
    | null;
  stationAttention?: "camera_retry_required" | null;
  stationAttentionMessage?: string | null;
  stationControlId?: string | null;
  stationControlAction?: "retry_camera" | "skip_camera" | null;
  stationControlIssuedAt?: number | null;
  stationControlAckId?: string | null;
  heightCm: number | null;
  weightKg: number | null;
  measurementUpdatedAt: number | null;
  measurementSource: "iot" | "manual" | null;
  measurementIssue?: string | null;
  measurementIssueAt?: number | null;
  measurementReviewStatus?: "none" | "verified_extreme";
  measurementReviewNote?: string | null;
  measurementReviewedAt?: number | null;
  measurementReviewedBy?: string | null;
  cancelledAt?: number | null;
  cancelReason?: string | null;
  cancelledBy?: string | null;
  bmi: number | null;
  captureStatus: "captured" | "skipped" | "failed" | null;
  facialStatus:
    | "stunting_indication"
    | "non_stunting_indication"
    | "rejected"
    | "unavailable"
    | null;
  facialProbability: number | null;
  facialReason: string | null;
  facialModelVersion: string | null;
  visualAnalysis?: VisualAnalysis | null;
  facePhotoUrl?: string | null;
  facePhotoCapturedAt?: number | null;
  recommendations?: Partial<GrowthRecommendations> | null;
  createdAt: number;
  completedAt: number | null;
  finalizedAt: number | null;
};

type SessionRecord = {
  userId: string;
  expiresAt: number;
  createdAt: number;
};

type GoogleRegistrationRecord = {
  name: string;
  email: string;
  expiresAt: number;
  createdAt: number;
};

type StationRecord = {
  activeExamId: string | null;
  updatedAt: number;
};

type DeviceRecord = {
  name: string;
  active: boolean;
  lastSeen: number | null;
  firmwareVersion?: string | null;
  heightSensor?: "ok" | "error" | "unknown";
  weightSensor?: "ok" | "error" | "unknown";
  claimedExamId?: string | null;
  resetToken?: string | null;
  resetRequestedAt?: number | null;
  resetReason?: string | null;
  resetExamId?: string | null;
  appliedResetToken?: string | null;
  currentExaminationId?: string | null;
  localSessionState?: "idle" | "queued" | "measuring" | "error" | "unknown";
  wifiConnected?: boolean | null;
  createdAt: number;
};

type StoredChat = ChatMessage & {
  parentId: string;
  examId: string;
};

type BlogRecord = BlogPostInput & {
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
};

const BLOG_CACHE_MS = 30_000;
const CHILD_COUNT_CACHE_MS = 60_000;
let blogCache: { expiresAt: number; items: FirestoreDoc<BlogRecord>[] } | null =
  null;
let childCountCache: { expiresAt: number; value: number } | null = null;

function store(env: Env): FirestoreRest {
  if (!env.FIRESTORE) {
    throw new ApiError(
      503,
      "Firestore belum dikonfigurasi.",
      "firebase_not_configured",
    );
  }
  return env.FIRESTORE;
}

function asStaff(id: string, value: StaffRecord): Staff {
  return {
    id,
    name: value.name,
    email: value.email,
    role: value.role,
    active: value.active ? 1 : 0,
  };
}

function asChild(doc: FirestoreDoc<ChildRecord>): ChildProfile {
  return {
    id: doc.id,
    code: doc.data.code,
    name: doc.data.name,
    nik: doc.data.nik ?? null,
    birthDate: doc.data.birthDate,
    sex: doc.data.sex,
    guardian: doc.data.guardian,
    createdAt: doc.data.createdAt,
    latestFacePhotoUrl: doc.data.latestFacePhotoUrl ?? null,
    latestFacePhotoUpdatedAt: doc.data.latestFacePhotoUpdatedAt ?? null,
  };
}

function asExam(doc: FirestoreDoc<ExamRecord>): Examination {
  const value = doc.data;
  const rawGrowth = assessAnthropometry(
    value.ageMonths,
    value.sex,
    value.heightCm,
    value.weightKg,
  );
  const verifiedExtreme = value.measurementReviewStatus === "verified_extreme";
  const growth = verifiedExtreme
    ? {
        ...rawGrowth,
        measurementQuality: "verified_extreme" as const,
        measurementReason:
          value.measurementReviewNote ||
          "Nilai ekstrem sudah dikonfirmasi setelah pengukuran ulang. Hasil otomatis tidak digunakan untuk menentukan status pertumbuhan.",
        heightForAgeZ: null,
        weightForAgeZ: null,
        growthStatus: "unavailable" as const,
        stuntingScreening: null,
      }
    : rawGrowth;
  const fallbackRecommendations = growthRecommendationsFor(
    growth.growthStatus,
    {
      ageMonths: value.ageMonths,
      currentHeightForAgeZ: growth.heightForAgeZ,
      currentAt: value.completedAt ?? value.createdAt,
    },
  );
  const recommendations: GrowthRecommendations = value.recommendations
    ? {
        ...fallbackRecommendations,
        ...value.recommendations,
        trend: value.recommendations.trend ?? fallbackRecommendations.trend,
        currentHeightForAgeZ:
          value.recommendations.currentHeightForAgeZ ??
          fallbackRecommendations.currentHeightForAgeZ,
        previousHeightForAgeZ:
          value.recommendations.previousHeightForAgeZ ?? null,
        trendDelta: value.recommendations.trendDelta ?? null,
        nutrition:
          value.recommendations.nutrition ?? fallbackRecommendations.nutrition,
        nextSteps:
          value.recommendations.nextSteps ?? fallbackRecommendations.nextSteps,
      }
    : fallbackRecommendations;

  return {
    id: doc.id,
    childId: value.childId,
    childName: value.childName,
    childCode: value.childCode,
    ageMonths: value.ageMonths,
    sex: value.sex,
    deviceId: value.deviceId,
    deviceName: value.deviceName,
    measurementMode: value.measurementMode ?? "device",
    status: value.status,
    cameraEnabled: value.cameraEnabled,
    stationStep: value.stationStep ?? null,
    stationAttention: value.stationAttention ?? null,
    stationAttentionMessage: value.stationAttentionMessage ?? null,
    stationControlId: value.stationControlId ?? null,
    stationControlAction: value.stationControlAction ?? null,
    stationControlAckId: value.stationControlAckId ?? null,
    heightCm: value.heightCm,
    weightKg: value.weightKg,
    bmi: value.bmi,
    heightForAgeZ: growth.heightForAgeZ,
    weightForAgeZ: growth.weightForAgeZ,
    measurementQuality: growth.measurementQuality,
    measurementReason: growth.measurementReason,
    captureStatus: value.captureStatus,
    facialStatus: value.facialStatus,
    facialProbability: value.facialProbability,
    facialReason: value.facialReason,
    facialModelVersion: value.facialModelVersion,
    visualAnalysis: value.visualAnalysis ?? null,
    growthStatus: growth.growthStatus,
    recommendations,
    createdAt: value.createdAt,
    completedAt: value.completedAt,
    finalizedAt: value.finalizedAt,
  };
}

function asBlog(doc: FirestoreDoc<BlogRecord>): BlogPost {
  return {
    id: doc.id,
    title: doc.data.title,
    excerpt: doc.data.excerpt,
    content: doc.data.content,
    category: doc.data.category,
    status: doc.data.status,
    authorId: doc.data.authorId,
    authorName: doc.data.authorName,
    createdAt: doc.data.createdAt,
    updatedAt: doc.data.updatedAt,
    publishedAt: doc.data.publishedAt,
  };
}

function asBlogSummary(doc: FirestoreDoc<BlogRecord>): BlogPostSummary {
  return {
    id: doc.id,
    title: doc.data.title,
    excerpt: doc.data.excerpt,
    category: doc.data.category,
    status: doc.data.status,
    authorId: doc.data.authorId,
    authorName: doc.data.authorName,
    createdAt: doc.data.createdAt,
    updatedAt: doc.data.updatedAt,
    publishedAt: doc.data.publishedAt,
  };
}

function byCreatedDesc<T extends { data: { createdAt: number } }>(a: T, b: T) {
  return b.data.createdAt - a.data.createdAt;
}

function canInitialize(request: Request, env: Env) {
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  return (
    env.ALLOW_LOCAL_SETUP === true &&
    loopback.has(new URL(env.APP_ORIGIN).hostname) &&
    loopback.has(new URL(request.url).hostname)
  );
}

async function emailIndex(email: string) {
  return digest(email.trim().toLowerCase());
}

function preconditionConflict(error: unknown) {
  return (
    error instanceof FirestoreError &&
    (error.status === 409 ||
      error.code === "ABORTED" ||
      error.code === "FAILED_PRECONDITION" ||
      error.code === "ALREADY_EXISTS")
  );
}

async function rateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const db = store(env);
  const now = Date.now();
  const bucket = Math.floor(now / (windowSeconds * 1000));
  const id = await digest(`${key}:${bucket}`);
  const path = `rateLimits/${id}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await db.get<{ count: number; expiresAt: number }>(path);
    const count = (current?.data.count ?? 0) + 1;

    if (count > limit) {
      throw new ApiError(
        429,
        "Terlalu banyak permintaan. Coba lagi nanti.",
        "rate_limited",
      );
    }

    try {
      await db.set(
        path,
        { count, expiresAt: now + windowSeconds * 1000 },
        {
          precondition: current
            ? { updateTime: current.updateTime }
            : { exists: false },
        },
      );
      return;
    } catch (error) {
      if (!preconditionConflict(error) || attempt === 2) throw error;
    }
  }
}

async function getStaffByEmail(env: Env, email: string) {
  const db = store(env);
  const index = await db.get<{ staffId: string }>(
    `staffEmails/${await emailIndex(email)}`,
  );
  if (!index) return null;
  const staff = await db.get<StaffRecord>(`staff/${index.data.staffId}`);
  return staff ? { id: staff.id, ...staff.data } : null;
}

async function getParentByEmail(env: Env, email: string) {
  const db = store(env);
  const index = await db.get<{ parentId: string }>(
    `parentEmails/${await emailIndex(email)}`,
  );
  if (!index) return null;
  const parent = await db.get<ParentRecord>(`parents/${index.data.parentId}`);
  return parent ? { id: parent.id, ...parent.data } : null;
}

async function signInStaff(
  request: Request,
  env: Env,
  id: string,
  value: StaffRecord,
) {
  const raw = token();
  const now = Date.now();
  await store(env).set(`staffSessions/${await digest(raw)}`, {
    userId: id,
    expiresAt: now + STAFF_SECONDS * 1000,
    createdAt: now,
  });

  return ok(asStaff(id, value), 200, {
    "Set-Cookie": sessionCookie(request, STAFF_COOKIE, raw, STAFF_SECONDS, env),
  });
}

async function signInParent(
  request: Request,
  env: Env,
  id: string,
  value: ParentRecord,
) {
  const raw = token();
  const now = Date.now();
  await store(env).set(`parentSessions/${await digest(raw)}`, {
    userId: id,
    expiresAt: now + PARENT_SECONDS * 1000,
    createdAt: now,
  });

  return ok(
    {
      id,
      name: value.name,
      email: value.email,
      avatarUrl: value.avatarUrl ?? null,
    },
    200,
    {
      "Set-Cookie": sessionCookie(
        request,
        PARENT_COOKIE,
        raw,
        PARENT_SECONDS,
        env,
      ),
    },
  );
}

function googleCookie(
  request: Request,
  env: Env,
  name: string,
  value: string,
  seconds: number,
  path = "/",
) {
  const secure = (env.APP_ORIGIN || request.url).startsWith("https://")
    ? "; Secure"
    : "";

  return `${name}=${encodeURIComponent(value)}; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure}`;
}

function googleStateCookie(
  request: Request,
  env: Env,
  value: string,
  seconds: number,
) {
  return googleCookie(
    request,
    env,
    GOOGLE_OAUTH_STATE_COOKIE,
    value,
    seconds,
    "/api/auth/google",
  );
}

function googleIntentCookie(
  request: Request,
  env: Env,
  value: "login" | "register" | "",
  seconds: number,
) {
  return googleCookie(
    request,
    env,
    GOOGLE_OAUTH_INTENT_COOKIE,
    value,
    seconds,
    "/api/auth/google",
  );
}

function googleRegisterCookie(
  request: Request,
  env: Env,
  value: string,
  seconds: number,
) {
  return googleCookie(
    request,
    env,
    GOOGLE_REGISTER_COOKIE,
    value,
    seconds,
    "/",
  );
}

function redirectResponse(location: string, cookies: string[] = []) {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "no-store",
  });

  for (const value of cookies) {
    if (value) headers.append("Set-Cookie", value);
  }

  return new Response(null, { status: 302, headers });
}

function googleLoginRedirect(
  request: Request,
  env: Env,
  code: string,
  clearState = false,
) {
  const cookies = clearState
    ? [
        googleStateCookie(request, env, "", 0),
        googleIntentCookie(request, env, "", 0),
      ]
    : [];

  return redirectResponse(
    `${env.APP_ORIGIN}/login?google=${encodeURIComponent(code)}`,
    cookies,
  );
}

async function googleOAuthStart(request: Request, env: Env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return googleLoginRedirect(request, env, "not_configured");
  }

  await rateLimit(
    env,
    `google-login-start:${await requestKey(request)}`,
    20,
    900,
  );

  const url = new URL(request.url);
  const intent =
    url.searchParams.get("intent") === "register" ? "register" : "login";
  const state = token();
  const redirectUri = `${env.APP_ORIGIN}/api/auth/google/callback`;
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authorize.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("prompt", "select_account");

  return redirectResponse(authorize.toString(), [
    googleStateCookie(request, env, state, GOOGLE_OAUTH_SECONDS),
    googleIntentCookie(request, env, intent, GOOGLE_OAUTH_SECONDS),
  ]);
}

async function googleOAuthCallback(request: Request, env: Env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return googleLoginRedirect(request, env, "not_configured", true);
  }

  const url = new URL(request.url);
  if (url.searchParams.get("error")) {
    return googleLoginRedirect(request, env, "cancelled", true);
  }

  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const expectedState = cookie(request, GOOGLE_OAUTH_STATE_COOKIE);
  const intent =
    cookie(request, GOOGLE_OAUTH_INTENT_COOKIE) === "register"
      ? "register"
      : "login";

  if (
    !code ||
    !/^[a-f0-9]{64}$/.test(state) ||
    !/^[a-f0-9]{64}$/.test(expectedState) ||
    state !== expectedState
  ) {
    return googleLoginRedirect(request, env, "session_expired", true);
  }

  try {
    const redirectUri = `${env.APP_ORIGIN}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Google token exchange failed.");
    }

    const tokenPayload = z
      .object({ access_token: z.string().min(1) })
      .passthrough()
      .safeParse(await tokenResponse.json());

    if (!tokenPayload.success) {
      throw new Error("Google token response is invalid.");
    }

    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenPayload.data.access_token}`,
        },
      },
    );

    if (!profileResponse.ok) {
      throw new Error("Google profile lookup failed.");
    }

    const profile = z
      .object({
        email: emailSchema,
        email_verified: z.boolean(),
        name: z.string().trim().min(1).max(80).optional(),
      })
      .passthrough()
      .safeParse(await profileResponse.json());

    if (!profile.success || !profile.data.email_verified) {
      throw new Error("Google email is not verified.");
    }

    const staff = await getStaffByEmail(env, profile.data.email);
    if (staff?.active) {
      const { id, ...record } = staff;
      const session = await signInStaff(request, env, id, record);
      return redirectResponse(
        `${env.APP_ORIGIN}${record.role === "admin" ? "/admin" : "/petugas"}`,
        [
          session.headers.get("set-cookie") || "",
          googleStateCookie(request, env, "", 0),
        ],
      );
    }

    const parent = await getParentByEmail(env, profile.data.email);
    if (parent?.active) {
      const { id, ...record } = parent;
      const session = await signInParent(request, env, id, record);
      return redirectResponse(`${env.APP_ORIGIN}/ortu`, [
        session.headers.get("set-cookie") || "",
        googleStateCookie(request, env, "", 0),
      ]);
    }

    if (intent !== "register") {
      return googleLoginRedirect(request, env, "not_registered", true);
    }

    const pendingToken = token();
    const parsedName = nameSchema.safeParse(profile.data.name || "");
    const pending: GoogleRegistrationRecord = {
      name: parsedName.success ? parsedName.data : "Pengguna Google",
      email: profile.data.email,
      expiresAt: Date.now() + GOOGLE_OAUTH_SECONDS * 1000,
      createdAt: Date.now(),
    };

    await store(env).set(
      `googleRegistrations/${await digest(pendingToken)}`,
      pending,
      { precondition: { exists: false } },
    );

    return redirectResponse(`${env.APP_ORIGIN}/login?google=register_ready`, [
      googleStateCookie(request, env, "", 0),
      googleIntentCookie(request, env, "", 0),
      googleRegisterCookie(request, env, pendingToken, GOOGLE_OAUTH_SECONDS),
    ]);
  } catch (error) {
    console.error(
      "Google OAuth failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return googleLoginRedirect(request, env, "failed", true);
  }
}

async function pendingGoogleRegistration(request: Request, env: Env) {
  const raw = cookie(request, GOOGLE_REGISTER_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(raw)) {
    throw new ApiError(
      401,
      "Sesi pendaftaran Google sudah berakhir. Silakan mulai lagi.",
      "google_registration_expired",
    );
  }

  const path = `googleRegistrations/${await digest(raw)}`;
  const pending = await store(env).get<GoogleRegistrationRecord>(path);

  if (!pending || pending.data.expiresAt <= Date.now()) {
    if (pending)
      await store(env)
        .delete(path)
        .catch(() => {});
    throw new ApiError(
      401,
      "Sesi pendaftaran Google sudah berakhir. Silakan mulai lagi.",
      "google_registration_expired",
    );
  }

  return { path, pending: pending.data };
}

async function googleRegistrationStatus(request: Request, env: Env) {
  const { pending } = await pendingGoogleRegistration(request, env);
  return ok({ name: pending.name, email: pending.email });
}

async function registerParentWithGoogle(request: Request, env: Env) {
  await rateLimit(
    env,
    `parent-register-google:${await requestKey(request)}`,
    6,
    3600,
  );

  const { path, pending } = await pendingGoogleRegistration(request, env);
  const input = await body(
    request,
    z.object({ child: childRegistrationSchema }).strict(),
  );

  const months = ageInMonths(input.child.birthDate);
  if (months < 0 || months > 59) {
    throw new ApiError(
      422,
      "Profil pertumbuhan ditujukan untuk anak usia 0–59 bulan.",
    );
  }

  if (await getStaffByEmail(env, pending.email)) {
    throw new ApiError(
      409,
      "Email Google ini sudah digunakan akun petugas atau admin.",
    );
  }

  if (await getParentByEmail(env, pending.email)) {
    throw new ApiError(409, "Email sudah terdaftar. Silakan masuk.");
  }

  const parentId = crypto.randomUUID();
  const childId = crypto.randomUUID();
  const now = Date.now();
  const parent: ParentRecord = {
    name: pending.name,
    email: pending.email,
    passwordHash: null,
    avatarUrl: null,
    avatarPublicId: null,
    active: true,
    createdAt: now,
  };
  const child: ChildRecord = {
    id: childId,
    code: `ST-${childId.slice(0, 8).toUpperCase()}`,
    name: input.child.name,
    nik: input.child.nik,
    birthDate: input.child.birthDate,
    sex: input.child.sex,
    guardian: pending.name,
    createdAt: now,
    latestFacePhotoUrl: null,
    latestFacePhotoUpdatedAt: null,
    latestFacePhotoPublicId: null,
    parentId,
  };

  try {
    await store(env).commit([
      {
        path: `parents/${parentId}`,
        data: parent,
        precondition: { exists: false },
      },
      {
        path: `parentEmails/${await emailIndex(pending.email)}`,
        data: { parentId },
        precondition: { exists: false },
      },
      {
        path: `children/${childId}`,
        data: child,
        precondition: { exists: false },
      },
      {
        path: `childNiks/${input.child.nik}`,
        data: { childId, createdAt: now },
        precondition: { exists: false },
      },
    ]);
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(409, "Email, NIK, atau profil sudah terdaftar.");
    }
    throw error;
  }

  await store(env)
    .delete(path)
    .catch(() => {});
  const response = await signInParent(request, env, parentId, parent);

  return ok(
    {
      id: parentId,
      name: parent.name,
      email: parent.email,
      avatarUrl: null,
    },
    201,
    {
      "Set-Cookie": response.headers.get("set-cookie") || "",
    },
  );
}

async function requireStaff(
  request: Request,
  env: Env,
  admin = false,
): Promise<Staff> {
  const raw = cookie(request, STAFF_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(raw)) {
    throw new ApiError(
      401,
      "Silakan masuk sebagai petugas.",
      "unauthenticated",
    );
  }

  const sessionHash = await digest(raw);
  const session = await store(env).get<SessionRecord>(
    `staffSessions/${sessionHash}`,
  );
  if (!session || session.data.expiresAt <= Date.now()) {
    throw new ApiError(
      401,
      "Sesi berakhir. Silakan masuk kembali.",
      "unauthenticated",
    );
  }

  const staff = await store(env).get<StaffRecord>(
    `staff/${session.data.userId}`,
  );
  if (!staff || !staff.data.active) {
    throw new ApiError(
      401,
      "Sesi berakhir. Silakan masuk kembali.",
      "unauthenticated",
    );
  }
  if (admin && staff.data.role !== "admin") {
    throw new ApiError(403, "Fitur ini hanya tersedia untuk admin.");
  }
  return asStaff(staff.id, staff.data);
}

async function requireParent(request: Request, env: Env) {
  const raw = cookie(request, PARENT_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(raw)) {
    throw new ApiError(
      401,
      "Silakan masuk sebagai orang tua.",
      "unauthenticated",
    );
  }
  const sessionHash = await digest(raw);
  const session = await store(env).get<SessionRecord>(
    `parentSessions/${sessionHash}`,
  );
  if (!session || session.data.expiresAt <= Date.now()) {
    throw new ApiError(
      401,
      "Sesi berakhir. Silakan masuk kembali.",
      "unauthenticated",
    );
  }
  const parent = await store(env).get<ParentRecord>(
    `parents/${session.data.userId}`,
  );
  if (!parent || !parent.data.active) {
    throw new ApiError(
      401,
      "Sesi berakhir. Silakan masuk kembali.",
      "unauthenticated",
    );
  }
  return {
    id: parent.id,
    ...parent.data,
    sessionHash,
  };
}

async function listChildren(env: Env, maxItems = 5000) {
  return (await store(env).list<ChildRecord>("children", maxItems)).sort(
    byCreatedDesc,
  );
}

async function childrenForParent(env: Env, parentId: string) {
  const items = await store(env).query<ChildRecord>("children", {
    where: { field: "parentId", op: "EQUAL", value: parentId },
  });
  return items.sort((a, b) => a.data.createdAt - b.data.createdAt);
}

async function examsForParent(env: Env, parentId: string) {
  const items = await store(env).query<ExamRecord>("examinations", {
    where: { field: "parentId", op: "EQUAL", value: parentId },
  });
  return items.sort(byCreatedDesc);
}

async function totalChildren(env: Env) {
  if (childCountCache && childCountCache.expiresAt > Date.now()) {
    return childCountCache.value;
  }

  const value = (await store(env).list<ChildRecord>("children")).length;
  childCountCache = {
    value,
    expiresAt: Date.now() + CHILD_COUNT_CACHE_MS,
  };
  return value;
}

async function recommendationsForExam(
  env: Env,
  exam: FirestoreDoc<ExamRecord>,
  heightCm: number | null,
  weightKg: number | null,
  completedAt: number,
) {
  const current = assessAnthropometry(
    exam.data.ageMonths,
    exam.data.sex,
    heightCm,
    weightKg,
  );
  const previousCandidates = await store(env).query<ExamRecord>(
    "examinations",
    {
      where: { field: "childId", op: "EQUAL", value: exam.data.childId },
    },
  );
  const indicator = linearGrowthIndicator(exam.data.ageMonths);
  const validPrevious = previousCandidates
    .filter(
      (item) =>
        item.id !== exam.id &&
        item.data.status === "completed" &&
        item.data.heightCm !== null &&
        linearGrowthIndicator(item.data.ageMonths) === indicator,
    )
    .map((item) => ({
      item,
      growth: assessAnthropometry(
        item.data.ageMonths,
        item.data.sex,
        item.data.heightCm,
        item.data.weightKg,
      ),
    }))
    .filter(
      (entry) =>
        entry.growth.measurementQuality !== "recheck" &&
        entry.growth.heightForAgeZ !== null,
    )
    .sort(
      (a, b) =>
        (b.item.data.completedAt ?? b.item.data.createdAt) -
        (a.item.data.completedAt ?? a.item.data.createdAt),
    );

  const previous = validPrevious[0] ?? null;
  const riskHistory = validPrevious
    .slice(0, 4)
    .reverse()
    .map((entry) => ({
      at: entry.item.data.completedAt ?? entry.item.data.createdAt,
      heightForAgeZ: entry.growth.heightForAgeZ!,
    }));

  if (current.heightForAgeZ !== null) {
    riskHistory.push({
      at: completedAt,
      heightForAgeZ: current.heightForAgeZ,
    });
  }

  return growthRecommendationsFor(current.growthStatus, {
    ageMonths: exam.data.ageMonths,
    currentHeightForAgeZ: current.heightForAgeZ,
    previousHeightForAgeZ: previous?.growth.heightForAgeZ ?? null,
    currentAt: completedAt,
    riskHistory,
  });
}

async function listBlogs(env: Env) {
  if (blogCache && blogCache.expiresAt > Date.now()) {
    return blogCache.items;
  }

  const db = store(env);
  const markerPath = "config/blogSeed";
  let items = await db.list<BlogRecord>("blogs");

  if (items.length === 0) {
    const marker = await db.get<{ version: string; seededAt: number }>(
      markerPath,
    );

    if (!marker) {
      const now = Date.now();
      const writes = STARTER_BLOGS.map((post, index) => {
        const timestamp = now - index * 60_000;
        const record: BlogRecord = {
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          status: post.status,
          authorId: "system-blog-seed",
          authorName: "StuntSpecula Edukasi",
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp,
        };
        return {
          path: `blogs/${post.id}`,
          data: record,
          precondition: { exists: false } as const,
        };
      });

      await db.commit([
        ...writes,
        {
          path: markerPath,
          data: { version: "starter-blogs-v1", seededAt: now },
          precondition: { exists: false },
        },
      ]);
      items = await db.list<BlogRecord>("blogs");
    }
  }

  items.sort((a, b) => b.data.updatedAt - a.data.updatedAt);
  blogCache = {
    items,
    expiresAt: Date.now() + BLOG_CACHE_MS,
  };
  return items;
}

async function getExam(env: Env, id: string) {
  const exam = await store(env).get<ExamRecord>(`examinations/${id}`);
  if (!exam) throw new ApiError(404, "Pemeriksaan tidak ditemukan.");
  return exam;
}

async function activeStation(env: Env) {
  const db = store(env);
  const station = await db.get<StationRecord>("system/station");
  if (!station?.data.activeExamId) {
    return { station, exam: null as FirestoreDoc<ExamRecord> | null };
  }

  const exam = await db.get<ExamRecord>(
    `examinations/${station.data.activeExamId}`,
  );

  if (
    !exam ||
    exam.data.status === "cancelled" ||
    (exam.data.status === "completed" && exam.data.finalizedAt !== null)
  ) {
    try {
      await db.set(
        "system/station",
        { activeExamId: null, updatedAt: Date.now() },
        {
          precondition: { updateTime: station.updateTime },
        },
      );
    } catch {}
    return { station: null, exam: null };
  }

  return { station, exam };
}

type DeviceHeartbeat = {
  firmwareVersion?: string;
  heightSensor?: "ok" | "error" | "unknown";
  weightSensor?: "ok" | "error" | "unknown";
  appliedResetToken?: string | null;
  currentExaminationId?: string | null;
  localSessionState?: "idle" | "queued" | "measuring" | "error" | "unknown";
  wifiConnected?: boolean;
};

async function touchIotDevice(env: Env, heartbeat: DeviceHeartbeat = {}) {
  const db = store(env);
  const path = `devices/${STATION_ID}`;
  const now = Date.now();
  const stateSignature = JSON.stringify(heartbeat);
  const stateChanged = stateSignature !== heartbeatStateSignature;

  if (!stateChanged && now - heartbeatPersistedAt < HEARTBEAT_PERSIST_MS) {
    return;
  }

  const patch: Omit<Partial<DeviceRecord>, "createdAt"> = {
    name: STATION_NAME,
    active: true,
    lastSeen: now,
  };

  if (heartbeat.firmwareVersion !== undefined) {
    patch.firmwareVersion = heartbeat.firmwareVersion;
  }
  if (heartbeat.heightSensor !== undefined) {
    patch.heightSensor = heartbeat.heightSensor;
  }
  if (heartbeat.weightSensor !== undefined) {
    patch.weightSensor = heartbeat.weightSensor;
  }
  if (heartbeat.appliedResetToken !== undefined) {
    patch.appliedResetToken = heartbeat.appliedResetToken;
  }
  if (heartbeat.currentExaminationId !== undefined) {
    patch.currentExaminationId = heartbeat.currentExaminationId;
  }
  if (heartbeat.localSessionState !== undefined) {
    patch.localSessionState = heartbeat.localSessionState;
  }
  if (heartbeat.wifiConnected !== undefined) {
    patch.wifiConnected = heartbeat.wifiConnected;
  }

  await db.set(path, patch, {
    mergeFields: Object.keys(patch),
  });
  heartbeatPersistedAt = now;
  heartbeatStateSignature = stateSignature;
}

async function stationDeviceState(env: Env) {
  const device = await store(env).get<DeviceRecord>(`devices/${STATION_ID}`);
  const now = Date.now();
  const lastSeen = device?.data.lastSeen ?? null;
  const online =
    !!device?.data.active &&
    lastSeen !== null &&
    now - lastSeen <= ONLINE_WINDOW_MS;

  return {
    name: device?.data.name || STATION_NAME,
    online,
    lastSeen,
    firmwareVersion: device?.data.firmwareVersion ?? null,
    heightSensor: device?.data.heightSensor ?? "unknown",
    weightSensor: device?.data.weightSensor ?? "unknown",
    claimedExamId: device?.data.claimedExamId ?? null,
    resetToken: device?.data.resetToken ?? null,
    resetRequestedAt: device?.data.resetRequestedAt ?? null,
    resetReason: device?.data.resetReason ?? null,
    resetExamId: device?.data.resetExamId ?? null,
    appliedResetToken: device?.data.appliedResetToken ?? null,
    currentExaminationId: device?.data.currentExaminationId ?? null,
    localSessionState: device?.data.localSessionState ?? "unknown",
    wifiConnected: device?.data.wifiConnected ?? null,
  };
}

async function bindIotDeviceExam(env: Env, examId: string | null) {
  const db = store(env);
  await touchIotDevice(env);
  await db.set(
    `devices/${STATION_ID}`,
    { claimedExamId: examId },
    { mergeFields: ["claimedExamId"] },
  );
}

async function clearIotDeviceExamIfMatches(env: Env, examId: string) {
  const db = store(env);
  const device = await db.get<DeviceRecord>(`devices/${STATION_ID}`);
  if (device?.data.claimedExamId !== examId) return;
  await db
    .set(
      `devices/${STATION_ID}`,
      { claimedExamId: null },
      {
        mergeFields: ["claimedExamId"],
        precondition: { updateTime: device.updateTime },
      },
    )
    .catch(() => {});
}

async function requestIotDeviceReset(
  env: Env,
  reason: string,
  examinationId: string | null,
  resetSensors = true,
) {
  const db = store(env);
  const device = await db.get<DeviceRecord>(`devices/${STATION_ID}`);
  const now = Date.now();
  const resetToken = crypto.randomUUID();
  const patch = {
    claimedExamId: null,
    resetToken,
    resetRequestedAt: now,
    resetReason: reason,
    resetExamId: examinationId,
    ...(resetSensors
      ? {
          heightSensor: "unknown" as const,
          weightSensor: "unknown" as const,
        }
      : {}),
  };

  if (device) {
    await db.set(`devices/${STATION_ID}`, patch, {
      mergeFields: Object.keys(patch),
      precondition: { updateTime: device.updateTime },
    });
  } else {
    await db.set(
      `devices/${STATION_ID}`,
      {
        name: STATION_NAME,
        active: true,
        lastSeen: null,
        firmwareVersion: null,
        heightSensor: "unknown",
        weightSensor: "unknown",
        claimedExamId: null,
        resetToken,
        resetRequestedAt: now,
        resetReason: reason,
        resetExamId: examinationId,
        appliedResetToken: null,
        currentExaminationId: null,
        localSessionState: "unknown",
        wifiConnected: null,
        createdAt: now,
      },
      { precondition: { exists: false } },
    );
  }

  return { resetToken, resetRequestedAt: now };
}

async function resetDeviceSession(request: Request, env: Env) {
  await requireStaff(request, env);
  await rateLimit(env, `device-reset:${await requestKey(request)}`, 12, 60);

  const db = store(env);
  const { exam } = await activeStation(env);

  if (exam?.data.status === "completed") {
    throw new ApiError(
      409,
      "Pemeriksaan sudah selesai. Finalisasi sesi sebelum me-refresh alat.",
      "device_reset_completed_exam",
    );
  }

  if (exam && ["queued", "running"].includes(exam.data.status)) {
    await db.set(
      `examinations/${exam.id}`,
      {
        heightCm: null,
        weightKg: null,
        measurementUpdatedAt: null,
        measurementSource: null,
        measurementIssue: null,
        measurementIssueAt: null,
        measurementReviewStatus: "none",
        measurementReviewNote: null,
        measurementReviewedAt: null,
        measurementReviewedBy: null,
        bmi: null,
        captureStatus: exam.data.cameraEnabled ? null : "skipped",
        facialStatus: null,
        facialProbability: null,
        facialReason: null,
        facialModelVersion: null,
        visualAnalysis: null,
        recommendations: null,
        completedAt: null,
      },
      {
        mergeFields: [
          "heightCm",
          "weightKg",
          "measurementUpdatedAt",
          "measurementSource",
          "measurementIssue",
          "measurementIssueAt",
          "measurementReviewStatus",
          "measurementReviewNote",
          "measurementReviewedAt",
          "measurementReviewedBy",
          "bmi",
          "captureStatus",
          "facialStatus",
          "facialProbability",
          "facialReason",
          "facialModelVersion",
          "visualAnalysis",
          "recommendations",
          "stationStep",
          "stationAttention",
          "stationAttentionMessage",
          "completedAt",
        ],
        precondition: { updateTime: exam.updateTime },
      },
    );
  }

  const reset = await requestIotDeviceReset(
    env,
    exam ? "session_restart" : "manual_refresh",
    exam?.id ?? null,
  );

  return ok({
    reset: true,
    resetToken: reset.resetToken,
    resetRequestedAt: reset.resetRequestedAt,
    examinationId: exam?.id ?? null,
    sessionRestarted: !!exam,
    message: exam
      ? "Sesi alat direset. Pengukuran sementara dihapus dan pemeriksaan dimulai ulang."
      : "State perangkat direset. Alat siap melakukan handshake ulang.",
  });
}

async function createActiveExam(
  env: Env,
  child: FirestoreDoc<ChildRecord>,
  staffId: string,
  parentId: string | null,
  cameraEnabled: boolean,
) {
  const db = store(env);
  const active = await activeStation(env);
  if (active.exam) {
    throw new ApiError(
      409,
      "Alat masih memiliki sesi aktif. Selesaikan atau batalkan sesi sebelumnya terlebih dahulu.",
    );
  }

  const age = ageInMonths(child.data.birthDate);
  if (age < 24 || age > 59) {
    throw new ApiError(
      422,
      "Pemeriksaan berdiri ini untuk anak usia 24–59 bulan.",
    );
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const exam: ExamRecord = {
    childId: child.id,
    childName: child.data.name,
    childCode: child.data.code,
    parentId,
    staffId,
    ageMonths: age,
    sex: child.data.sex,
    deviceId: STATION_ID,
    deviceName: STATION_NAME,
    measurementMode: "device",
    status: "queued",
    cameraEnabled,
    stationStep: cameraEnabled ? "camera" : "prepare",
    stationAttention: null,
    stationAttentionMessage: null,
    stationControlId: null,
    stationControlAction: null,
    stationControlIssuedAt: null,
    stationControlAckId: null,
    heightCm: null,
    weightKg: null,
    measurementUpdatedAt: null,
    measurementSource: null,
    measurementIssue: null,
    measurementIssueAt: null,
    measurementReviewStatus: "none",
    measurementReviewNote: null,
    measurementReviewedAt: null,
    measurementReviewedBy: null,
    cancelledAt: null,
    cancelReason: null,
    cancelledBy: null,
    bmi: null,
    captureStatus: cameraEnabled ? null : "skipped",
    facialStatus: null,
    facialProbability: null,
    facialReason: null,
    facialModelVersion: null,
    visualAnalysis: null,
    recommendations: null,
    createdAt: now,
    completedAt: null,
    finalizedAt: null,
  };

  try {
    await db.commit([
      {
        path: `examinations/${id}`,
        data: exam,
        precondition: { exists: false },
      },
      {
        path: "system/station",
        data: { activeExamId: id, updatedAt: now },
        precondition: active.station
          ? { updateTime: active.station.updateTime }
          : { exists: false },
      },
    ]);
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(
        409,
        "Alat baru saja menerima sesi lain. Silakan coba lagi.",
      );
    }
    throw error;
  }

  return { id, status: "queued" as const };
}

async function clearStationIfMatches(
  env: Env,
  examId: string,
  station?: FirestoreDoc<StationRecord> | null,
) {
  const db = store(env);
  const current = station ?? (await db.get<StationRecord>("system/station"));
  if (!current || current.data.activeExamId !== examId) return;
  try {
    await db.set(
      "system/station",
      { activeExamId: null, updatedAt: Date.now() },
      {
        precondition: { updateTime: current.updateTime },
      },
    );
  } catch {}
  await clearIotDeviceExamIfMatches(env, examId);
}

async function finalizeExam(env: Env, exam: FirestoreDoc<ExamRecord>) {
  if (exam.data.status !== "completed") {
    throw new ApiError(409, "Pemeriksaan di alat belum selesai.");
  }
  if (exam.data.finalizedAt !== null) {
    return { id: exam.id, finalized: true };
  }

  await store(env).set(
    `examinations/${exam.id}`,
    { finalizedAt: Date.now() },
    {
      mergeFields: ["finalizedAt"],
      precondition: { updateTime: exam.updateTime },
    },
  );
  await clearStationIfMatches(env, exam.id);
  return { id: exam.id, finalized: true };
}

async function cancelExam(
  env: Env,
  exam: FirestoreDoc<ExamRecord>,
  reason = "user_cancelled",
  cancelledBy = "system",
) {
  if (!["queued", "running"].includes(exam.data.status)) {
    throw new ApiError(409, "Sesi ini sudah selesai.");
  }
  const now = Date.now();
  await store(env).set(
    `examinations/${exam.id}`,
    {
      status: "cancelled",
      finalizedAt: now,
      cancelledAt: now,
      cancelReason: reason,
      cancelledBy,
    },
    {
      mergeFields: [
        "status",
        "finalizedAt",
        "cancelledAt",
        "cancelReason",
        "cancelledBy",
      ],
      precondition: { updateTime: exam.updateTime },
    },
  );
  await clearStationIfMatches(env, exam.id);
  const reset = await requestIotDeviceReset(
    env,
    "session_cancelled",
    exam.id,
  ).catch(() => null);
  return {
    id: exam.id,
    cancelled: true,
    deviceResetPending: !!reset,
    resetToken: reset?.resetToken ?? null,
  };
}

const completionSchema = z
  .object({
    heightCm: z.number().finite().min(30).max(200).nullable(),
    weightKg: z.number().finite().min(1).max(100).nullable(),
    captureStatus: z.enum(["captured", "skipped", "failed"]),
    facialStatus: z
      .enum([
        "stunting_indication",
        "non_stunting_indication",
        "rejected",
        "unavailable",
      ])
      .default("unavailable"),
    facialProbability: z
      .number()
      .finite()
      .min(0)
      .max(1)
      .nullable()
      .default(null),
    facialReason: z.string().trim().max(80).nullable().default(null),
    facialModelVersion: z.string().trim().max(40).nullable().default(null),
    visualAnalysis: z
      .object({
        status: z.enum(["ok", "rejected", "unavailable"]),
        faceDetected: z.boolean().nullable(),
        singleFace: z.boolean().nullable(),
        eyes: z.enum(["visible", "partial", "not_visible", "unclear"]),
        nose: z.enum(["visible", "partial", "not_visible", "unclear"]),
        mouth: z.enum(["visible", "partial", "not_visible", "unclear"]),
        facePosition: z.enum([
          "frontal",
          "slightly_turned",
          "partial",
          "unclear",
        ]),
        lighting: z.enum(["good", "low", "bright", "uneven", "unclear"]),
        observations: z.array(z.string().trim().min(1).max(180)).max(4),
        reason: z.string().trim().max(180).nullable(),
        modelVersion: z.string().trim().max(80).nullable(),
      })
      .nullable()
      .default(null),
  })
  .strict();

const iotMeasurementSchema = z
  .object({
    examinationId: idSchema.optional(),
    heightCm: z.number().finite().min(30).max(200).optional(),
    weightKg: z.number().finite().min(1).max(100).optional(),
  })
  .strict()
  .refine(
    (value) => value.heightCm !== undefined || value.weightKg !== undefined,
    "Minimal satu hasil pengukuran harus dikirim.",
  );

const iotHeartbeatSchema = z
  .object({
    firmwareVersion: z.string().trim().min(1).max(40).optional(),
    heightSensor: z.enum(["ok", "error", "unknown"]).optional(),
    weightSensor: z.enum(["ok", "error", "unknown"]).optional(),
    appliedResetToken: z.string().uuid().nullable().optional(),
    currentExaminationId: idSchema.nullable().optional(),
    localSessionState: z
      .enum(["idle", "queued", "measuring", "error", "unknown"])
      .optional(),
    wifiConnected: z.boolean().optional(),
  })
  .strict();

async function authConfig(request: Request, env: Env) {
  const staff = (await store(env).list<StaffRecord>("staff")).filter(
    (item) => item.data.role === "admin" || item.data.role === "staff",
  );
  const facility = await store(env).get<{ name: string }>("config/facility");

  return ok({
    needsSetup: staff.length === 0,
    canSetup: canInitialize(request, env),
    facility: facility?.data.name || "Fasilitas StuntSpecula",
    aiAvailable: !!env.GEMINI_API_KEY && !!env.GEMINI_MODEL,
    database: "firestore",
  });
}

async function setup(request: Request, env: Env) {
  await rateLimit(env, `setup:${await requestKey(request)}`, 5, 900);
  if (!canInitialize(request, env)) {
    throw new ApiError(
      403,
      "Buat admin pertama melalui localhost yang terhubung ke Firebase.",
      "setup_restricted",
    );
  }

  const input = await body(
    request,
    z.object({
      name: nameSchema,
      email: emailSchema,
      password: passwordSchema,
      facility: nameSchema,
    }),
  );

  const existing = (await store(env).list<StaffRecord>("staff")).filter(
    (item) => item.data.role === "admin",
  );
  if (existing.length) {
    throw new ApiError(409, "Setup sudah selesai. Silakan masuk.");
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const record: StaffRecord = {
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: "admin",
    active: true,
    createdAt: now,
  };

  await store(env).commit([
    {
      path: `staff/${id}`,
      data: record,
      precondition: { exists: false },
    },
    {
      path: `staffEmails/${await emailIndex(input.email)}`,
      data: { staffId: id },
      precondition: { exists: false },
    },
    {
      path: "config/facility",
      data: { name: input.facility },
    },
  ]);

  return signInStaff(request, env, id, record);
}

async function staffLogin(request: Request, env: Env) {
  await rateLimit(env, `login-ip:${await requestKey(request)}`, 12, 900);
  const input = await body(
    request,
    z.object({ email: emailSchema, password: loginPasswordSchema }),
  );

  const user = await getStaffByEmail(env, input.email);
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash || DUMMY_PASSWORD_HASH,
  );

  if (!user || !valid || !user.active) {
    throw new ApiError(401, "Email atau password tidak sesuai.");
  }

  const { id, ...record } = user;
  return signInStaff(request, env, id, record);
}

async function unifiedLogin(request: Request, env: Env) {
  await rateLimit(env, `unified-login:${await requestKey(request)}`, 12, 900);
  const input = await body(
    request,
    z.object({ email: emailSchema, password: loginPasswordSchema }),
  );

  const staff = await getStaffByEmail(env, input.email);
  if (staff && staff.active) {
    const valid = await verifyPassword(input.password, staff.passwordHash);
    if (valid) {
      const { id, ...record } = staff;
      const response = await signInStaff(request, env, id, record);
      return ok(
        {
          role: record.role,
          name: record.name,
          redirectTo: record.role === "admin" ? "/admin" : "/petugas",
        },
        200,
        {
          "Set-Cookie": response.headers.get("set-cookie") || "",
        },
      );
    }
  }

  const parent = await getParentByEmail(env, input.email);
  if (parent && parent.active) {
    const valid = await verifyPassword(
      input.password,
      parent.passwordHash || DUMMY_PASSWORD_HASH,
    );
    if (valid) {
      const { id, ...record } = parent;
      const response = await signInParent(request, env, id, record);
      return ok(
        {
          role: "parent",
          name: record.name,
          redirectTo: "/ortu",
        },
        200,
        {
          "Set-Cookie": response.headers.get("set-cookie") || "",
        },
      );
    }
  }

  await verifyPassword(input.password, DUMMY_PASSWORD_HASH);
  throw new ApiError(401, "Email atau password tidak sesuai.");
}

async function staffLogout(request: Request, env: Env) {
  const raw = cookie(request, STAFF_COOKIE);
  if (/^[a-f0-9]{64}$/.test(raw)) {
    await store(env)
      .delete(`staffSessions/${await digest(raw)}`)
      .catch(() => {});
  }
  return ok(null, 200, {
    "Set-Cookie": sessionCookie(request, STAFF_COOKIE, "", 0, env),
  });
}

async function listStaff(request: Request, env: Env) {
  await requireStaff(request, env, true);
  const staff = (await store(env).list<StaffRecord>("staff"))
    .filter((item) => item.data.role === "staff")
    .sort(byCreatedDesc)
    .slice(0, 100)
    .map((item) => asStaff(item.id, item.data));
  return ok(staff);
}

async function createStaff(request: Request, env: Env) {
  await requireStaff(request, env, true);
  const input = await body(
    request,
    z.object({
      name: nameSchema,
      email: emailSchema,
      password: passwordSchema,
      role: z.literal("staff").default("staff"),
    }),
  );
  if (await getStaffByEmail(env, input.email)) {
    throw new ApiError(409, "Email sudah terdaftar.");
  }

  const id = crypto.randomUUID();
  const record: StaffRecord = {
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: "staff",
    active: true,
    createdAt: Date.now(),
  };

  try {
    await store(env).commit([
      {
        path: `staff/${id}`,
        data: record,
        precondition: { exists: false },
      },
      {
        path: `staffEmails/${await emailIndex(input.email)}`,
        data: { staffId: id },
        precondition: { exists: false },
      },
    ]);
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(409, "Email sudah terdaftar.");
    }
    throw error;
  }

  return ok({ id }, 201);
}

async function setStaffActive(request: Request, env: Env, id: string) {
  await requireStaff(request, env, true);
  const { active } = await body(request, z.object({ active: z.boolean() }));
  const user = await store(env).get<StaffRecord>(`staff/${id}`);
  if (!user || user.data.role !== "staff") {
    throw new ApiError(404, "Petugas tidak ditemukan.");
  }

  await store(env).set(
    `staff/${id}`,
    { active },
    {
      mergeFields: ["active"],
      precondition: { updateTime: user.updateTime },
    },
  );

  if (!active) {
    const sessions = await store(env).list<SessionRecord>("staffSessions");
    await Promise.all(
      sessions
        .filter((item) => item.data.userId === id)
        .map((item) =>
          store(env)
            .delete(`staffSessions/${item.id}`)
            .catch(() => {}),
        ),
    );
  }

  return ok({ id });
}

const childRegistrationSchema = z.object({
  name: nameSchema,
  nik: z.string().regex(/^\d{16}$/, "NIK anak harus terdiri dari 16 digit."),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(["male", "female"]),
});

async function registerParent(request: Request, env: Env) {
  await rateLimit(env, `parent-register:${await requestKey(request)}`, 6, 3600);
  const input = await body(
    request,
    z
      .object({
        name: nameSchema,
        email: emailSchema,
        password: parentPasswordSchema,
        child: childRegistrationSchema,
      })
      .strict(),
  );

  const months = ageInMonths(input.child.birthDate);
  if (months < 0 || months > 59) {
    throw new ApiError(
      422,
      "Profil pertumbuhan ditujukan untuk anak usia 0–59 bulan.",
    );
  }
  if (await getParentByEmail(env, input.email)) {
    throw new ApiError(409, "Email sudah terdaftar. Silakan masuk.");
  }

  const parentId = crypto.randomUUID();
  const childId = crypto.randomUUID();
  const now = Date.now();
  const parent: ParentRecord = {
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    avatarUrl: null,
    avatarPublicId: null,
    active: true,
    createdAt: now,
  };
  const child: ChildRecord = {
    id: childId,
    code: `ST-${childId.slice(0, 8).toUpperCase()}`,
    name: input.child.name,
    nik: input.child.nik,
    birthDate: input.child.birthDate,
    sex: input.child.sex,
    guardian: input.name,
    createdAt: now,
    latestFacePhotoUrl: null,
    latestFacePhotoUpdatedAt: null,
    latestFacePhotoPublicId: null,
    parentId,
  };

  try {
    await store(env).commit([
      {
        path: `parents/${parentId}`,
        data: parent,
        precondition: { exists: false },
      },
      {
        path: `parentEmails/${await emailIndex(input.email)}`,
        data: { parentId },
        precondition: { exists: false },
      },
      {
        path: `children/${childId}`,
        data: child,
        precondition: { exists: false },
      },
      {
        path: `childNiks/${input.child.nik}`,
        data: { childId, createdAt: now },
        precondition: { exists: false },
      },
    ]);
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(409, "Email, NIK, atau profil sudah terdaftar.");
    }
    throw error;
  }

  return signInParent(request, env, parentId, parent);
}

async function parentLogin(request: Request, env: Env) {
  await rateLimit(env, `parent-login:${await requestKey(request)}`, 12, 900);
  const input = await body(
    request,
    z.object({ email: emailSchema, password: loginPasswordSchema }),
  );
  const parent = await getParentByEmail(env, input.email);
  const valid = await verifyPassword(
    input.password,
    parent?.passwordHash || DUMMY_PASSWORD_HASH,
  );
  if (!parent || !valid || !parent.active) {
    throw new ApiError(401, "Email atau password tidak sesuai.");
  }
  const { id, ...record } = parent;
  return signInParent(request, env, id, record);
}

async function parentLogout(request: Request, env: Env) {
  const raw = cookie(request, PARENT_COOKIE);
  if (/^[a-f0-9]{64}$/.test(raw)) {
    await store(env)
      .delete(`parentSessions/${await digest(raw)}`)
      .catch(() => {});
  }
  return ok(null, 200, {
    "Set-Cookie": sessionCookie(request, PARENT_COOKIE, "", 0, env),
  });
}

async function createParentChild(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  await rateLimit(env, `parent-child:${parent.sessionHash}`, 10, 3600);

  const input = await body(request, childRegistrationSchema);
  const months = ageInMonths(input.birthDate);
  if (months < 0 || months > 59) {
    throw new ApiError(
      422,
      "Profil pertumbuhan ditujukan untuk anak usia 0–59 bulan.",
    );
  }

  const existing = await childrenForParent(env, parent.id);
  if (existing.length >= 10) {
    throw new ApiError(422, "Maksimal 10 profil anak dalam satu akun.");
  }

  const duplicate = existing.some(
    (item) =>
      item.data.name.toLowerCase() === input.name.toLowerCase() &&
      item.data.birthDate === input.birthDate,
  );
  if (duplicate) {
    throw new ApiError(
      409,
      "Profil anak dengan nama dan tanggal lahir ini sudah ada.",
    );
  }

  const id = crypto.randomUUID();
  const child: ChildRecord = {
    id,
    code: `ST-${id.slice(0, 8).toUpperCase()}`,
    name: input.name,
    nik: input.nik,
    birthDate: input.birthDate,
    sex: input.sex,
    guardian: parent.name,
    createdAt: Date.now(),
    latestFacePhotoUrl: null,
    latestFacePhotoUpdatedAt: null,
    latestFacePhotoPublicId: null,
    parentId: parent.id,
  };

  try {
    await store(env).commit([
      {
        path: `children/${id}`,
        data: child,
        precondition: { exists: false },
      },
      {
        path: `childNiks/${input.nik}`,
        data: { childId: id, createdAt: child.createdAt },
        precondition: { exists: false },
      },
    ]);
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(409, "NIK anak sudah terdaftar.");
    }
    throw error;
  }
  childCountCache = null;

  return ok(asChild({ id, data: child, updateTime: "" }), 201);
}

async function updateParentChild(request: Request, env: Env, childId: string) {
  const parent = await requireParent(request, env);
  await rateLimit(env, `parent-child-update:${parent.sessionHash}`, 20, 3600);

  const input = await body(request, childRegistrationSchema.strict());
  const months = ageInMonths(input.birthDate);
  if (months < 0 || months > 59) {
    throw new ApiError(
      422,
      "Profil pertumbuhan ditujukan untuk anak usia 0–59 bulan.",
    );
  }

  const current = await store(env).get<ChildRecord>(`children/${childId}`);
  if (!current || current.data.parentId !== parent.id) {
    throw new ApiError(404, "Profil anak tidak ditemukan.");
  }

  const siblings = await childrenForParent(env, parent.id);
  const duplicate = siblings.some(
    (item) =>
      item.id !== childId &&
      item.data.name.toLowerCase() === input.name.toLowerCase() &&
      item.data.birthDate === input.birthDate,
  );
  if (duplicate) {
    throw new ApiError(
      409,
      "Profil anak dengan nama dan tanggal lahir ini sudah ada.",
    );
  }

  const writes: FirestoreWrite[] = [
    {
      path: `children/${childId}`,
      data: {
        name: input.name,
        nik: input.nik,
        birthDate: input.birthDate,
        sex: input.sex,
      },
      mergeFields: ["name", "nik", "birthDate", "sex"],
      precondition: { updateTime: current.updateTime },
    },
  ];
  const previousNik = current.data.nik ?? null;
  if (previousNik !== input.nik) {
    writes.push({
      path: `childNiks/${input.nik}`,
      data: { childId, updatedAt: Date.now() },
      precondition: { exists: false },
    });
    if (previousNik) {
      writes.push({
        path: `childNiks/${previousNik}`,
        delete: true,
      });
    }
  }

  try {
    await store(env).commit(writes);
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(409, "NIK anak sudah terdaftar.");
    }
    throw error;
  }

  return ok(
    asChild({
      id: childId,
      data: { ...current.data, ...input },
      updateTime: current.updateTime,
    }),
  );
}

async function parentView(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  const [childDocs, examDocs] = await Promise.all([
    childrenForParent(env, parent.id),
    examsForParent(env, parent.id),
  ]);
  const children = childDocs.map(asChild);
  const exams = examDocs.slice(0, 100).map(asExam);

  return ok({
    parent: {
      id: parent.id,
      name: parent.name,
      email: parent.email,
      avatarUrl: parent.avatarUrl ?? null,
    },
    children,
    examinations: exams,
    aiAvailable: !!env.GEMINI_API_KEY && !!env.GEMINI_MODEL,
  });
}

async function parentActiveExam(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  const { exam } = await activeStation(env);

  if (!exam || exam.data.parentId !== parent.id) {
    return ok(null);
  }

  return ok(asExam(exam));
}

async function parentBlogs(request: Request, env: Env) {
  await requireParent(request, env);
  const posts = (await listBlogs(env))
    .filter((item) => item.data.status === "published")
    .sort(
      (a, b) =>
        (b.data.publishedAt ?? b.data.updatedAt) -
        (a.data.publishedAt ?? a.data.updatedAt),
    )
    .slice(0, 100)
    .map(asBlogSummary);
  return ok(posts);
}

async function parentBlog(request: Request, env: Env, blogId: string) {
  await requireParent(request, env);
  const post = await store(env).get<BlogRecord>(`blogs/${blogId}`);
  if (!post || post.data.status !== "published") {
    throw new ApiError(404, "Artikel tidak ditemukan.");
  }
  return ok(asBlog(post));
}

async function staffBlogs(request: Request, env: Env) {
  await requireStaff(request, env);
  return ok((await listBlogs(env)).slice(0, 150).map(asBlog));
}

async function staffBlog(request: Request, env: Env, blogId: string) {
  await requireStaff(request, env);
  const post = await store(env).get<BlogRecord>(`blogs/${blogId}`);
  if (!post) throw new ApiError(404, "Artikel tidak ditemukan.");
  return ok(asBlog(post));
}

async function createBlog(request: Request, env: Env) {
  const actor = await requireStaff(request, env);
  const input = await body(request, blogInputSchema);
  const id = crypto.randomUUID();
  const now = Date.now();
  const record: BlogRecord = {
    ...input,
    authorId: actor.id,
    authorName: actor.name,
    createdAt: now,
    updatedAt: now,
    publishedAt: input.status === "published" ? now : null,
  };

  await store(env).set(`blogs/${id}`, record, {
    precondition: { exists: false },
  });
  blogCache = null;

  return ok(asBlog({ id, data: record, updateTime: "" }), 201);
}

async function updateBlog(request: Request, env: Env, blogId: string) {
  const actor = await requireStaff(request, env);
  const input = await body(request, blogInputSchema);
  const current = await store(env).get<BlogRecord>(`blogs/${blogId}`);
  if (!current) throw new ApiError(404, "Artikel tidak ditemukan.");

  const now = Date.now();
  const publishedAt =
    input.status === "published" ? (current.data.publishedAt ?? now) : null;
  const patch: BlogRecord = {
    ...current.data,
    ...input,
    authorId: actor.id,
    authorName: actor.name,
    updatedAt: now,
    publishedAt,
  };

  await store(env).set(`blogs/${blogId}`, patch, {
    precondition: { updateTime: current.updateTime },
  });
  blogCache = null;

  return ok(
    asBlog({ id: blogId, data: patch, updateTime: current.updateTime }),
  );
}

async function deleteBlog(request: Request, env: Env, blogId: string) {
  await requireStaff(request, env);
  const current = await store(env).get<BlogRecord>(`blogs/${blogId}`);
  if (!current) return ok({ deleted: false });

  await store(env).delete(`blogs/${blogId}`);
  blogCache = null;
  return ok({ deleted: true });
}

async function uploadLatestFacePhoto(request: Request, env: Env) {
  const examinationId = request.headers.get("x-examination-id")?.trim() || "";
  if (!idSchema.safeParse(examinationId).success) {
    throw new ApiError(422, "Sesi foto tidak valid.");
  }

  const exam = await getExam(env, examinationId);
  if (
    !["running", "completed"].includes(exam.data.status) ||
    exam.data.captureStatus === "skipped"
  ) {
    throw new ApiError(409, "Sesi ini tidak dapat menyimpan foto wajah.");
  }

  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      503,
      "Penyimpanan foto wajah belum dikonfigurasi.",
      "cloudinary_not_configured",
    );
  }

  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    throw new ApiError(415, "Gunakan file gambar untuk foto wajah.");
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    throw new ApiError(422, "Foto wajah tidak valid.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new ApiError(413, "Ukuran foto wajah maksimal 2 MB.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `stuntspecula/examinations/${exam.data.childId}`;
  const publicId = exam.id;
  const signature = createHash("sha1")
    .update(
      `folder=${folder}&overwrite=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`,
    )
    .digest("hex");

  const upload = new FormData();
  upload.append("file", file);
  upload.append("api_key", apiKey);
  upload.append("timestamp", String(timestamp));
  upload.append("folder", folder);
  upload.append("public_id", publicId);
  upload.append("overwrite", "true");
  upload.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      cloudName,
    )}/image/upload`,
    { method: "POST", body: upload },
  );
  const payload = (await response.json().catch(() => null)) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  } | null;

  if (!response.ok || !payload?.secure_url || !payload.public_id) {
    console.error(
      "Cloudinary latest face upload failed",
      response.status,
      payload?.error?.message || "Unknown Cloudinary error",
    );
    throw new ApiError(
      502,
      "Foto wajah belum berhasil disimpan.",
      "face_photo_upload_failed",
    );
  }

  const child = await store(env).get<ChildRecord>(
    `children/${exam.data.childId}`,
  );
  if (!child) throw new ApiError(404, "Profil anak tidak ditemukan.");

  const updatedAt = Date.now();
  await store(env).set(
    `children/${exam.data.childId}`,
    {
      latestFacePhotoUrl: payload.secure_url,
      latestFacePhotoPublicId: payload.public_id,
      latestFacePhotoUpdatedAt: updatedAt,
    },
    {
      mergeFields: [
        "latestFacePhotoUrl",
        "latestFacePhotoPublicId",
        "latestFacePhotoUpdatedAt",
      ],
      precondition: { updateTime: child.updateTime },
    },
  );

  await store(env).set(
    `examinations/${exam.id}`,
    {
      facePhotoUrl: payload.secure_url,
      facePhotoCapturedAt: updatedAt,
    },
    {
      mergeFields: ["facePhotoUrl", "facePhotoCapturedAt"],
    },
  );

  return ok({
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
  });
}

async function uploadParentProfilePhoto(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      503,
      "Upload foto profil belum dikonfigurasi.",
      "cloudinary_not_configured",
    );
  }

  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    throw new ApiError(415, "Gunakan file gambar untuk foto profil.");
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    throw new ApiError(422, "Pilih foto profil terlebih dahulu.");
  }

  if (!file.type.startsWith("image/")) {
    throw new ApiError(422, "File foto profil harus berupa gambar.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError(413, "Ukuran foto maksimal 5 MB.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `stuntspecula/profile/${parent.id}`;
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const upload = new FormData();
  upload.append("file", file);
  upload.append("api_key", apiKey);
  upload.append("timestamp", String(timestamp));
  upload.append("folder", folder);
  upload.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      cloudName,
    )}/image/upload`,
    {
      method: "POST",
      body: upload,
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  } | null;

  if (!response.ok || !payload?.secure_url || !payload.public_id) {
    console.error(
      "Cloudinary profile upload failed",
      response.status,
      payload?.error?.message || "Unknown Cloudinary error",
    );
    throw new ApiError(
      502,
      "Foto profil gagal diunggah. Silakan coba lagi.",
      "profile_upload_failed",
    );
  }

  return ok({
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
  });
}

async function updateParentProfile(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  const input = await body(
    request,
    z
      .object({
        avatarUrl: z.string().url().max(1200).nullable(),
        avatarPublicId: z.string().trim().min(1).max(255).nullable(),
      })
      .strict(),
  );

  if (
    input.avatarUrl &&
    !/^https:\/\/res\.cloudinary\.com\//i.test(input.avatarUrl)
  ) {
    throw new ApiError(
      422,
      "Foto profil harus berasal dari Cloudinary.",
      "invalid_profile_image",
    );
  }

  await store(env).set(
    `parents/${parent.id}`,
    {
      avatarUrl: input.avatarUrl,
      avatarPublicId: input.avatarPublicId,
    },
    { mergeFields: ["avatarUrl", "avatarPublicId"] },
  );
  return ok(input);
}

async function staffChildren(request: Request, env: Env) {
  await requireStaff(request, env);
  const search = (new URL(request.url).searchParams.get("q") || "")
    .trim()
    .toLowerCase()
    .slice(0, 80);

  const source = await listChildren(env, search ? 1000 : 100);
  const values = source
    .filter((item) => {
      if (!search) return true;
      return (
        item.data.name.toLowerCase().includes(search) ||
        item.data.code.toLowerCase().includes(search) ||
        item.data.guardian.toLowerCase().includes(search)
      );
    })
    .slice(0, 100)
    .map(asChild);

  return ok(values);
}

async function createChild(request: Request, env: Env) {
  await requireStaff(request, env);
  const input = await body(request, childProfileSchema);
  const months = ageInMonths(input.birthDate);
  if (months < 0 || months > 59) {
    throw new ApiError(422, "Pemeriksaan ini untuk anak usia 0–59 bulan.");
  }

  const existing = (await listChildren(env)).find(
    (item) => item.data.code.toUpperCase() === input.code.toUpperCase(),
  );
  if (existing) {
    throw new ApiError(409, "Kode anak sudah digunakan.");
  }

  const id = crypto.randomUUID();
  const value: ChildRecord = {
    id,
    ...input,
    nik: input.nik ?? null,
    code: input.code.toUpperCase(),
    createdAt: Date.now(),
    latestFacePhotoUrl: null,
    latestFacePhotoUpdatedAt: null,
    latestFacePhotoPublicId: null,
    parentId: null,
  };
  const writes: FirestoreWrite[] = [
    {
      path: `children/${id}`,
      data: value,
      precondition: { exists: false },
    },
  ];
  if (value.nik) {
    writes.push({
      path: `childNiks/${value.nik}`,
      data: { childId: id, createdAt: value.createdAt },
      precondition: { exists: false },
    });
  }
  try {
    await store(env).commit(writes);
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(409, "Kode atau NIK anak sudah digunakan.");
    }
    throw error;
  }
  childCountCache = null;
  return ok({ id }, 201);
}

async function staffExams(request: Request, env: Env) {
  await requireStaff(request, env);
  const url = new URL(request.url);
  const childId = url.searchParams.get("childId");
  const page = Number(url.searchParams.get("page") || "0");
  if (!Number.isInteger(page) || page < 0 || page > 100000) {
    throw new ApiError(422, "Halaman tidak valid.");
  }
  if (childId && !idSchema.safeParse(childId).success) {
    throw new ApiError(422, "Profil tidak valid.");
  }

  const db = store(env);
  const docs = childId
    ? (
        await db.query<ExamRecord>("examinations", {
          where: { field: "childId", op: "EQUAL", value: childId },
        })
      )
        .sort(byCreatedDesc)
        .slice(page * 50, page * 50 + 50)
    : await db.query<ExamRecord>("examinations", {
        orderBy: [{ field: "createdAt", direction: "DESCENDING" }],
        offset: page * 50,
        limit: 50,
      });

  return ok(docs.map(asExam));
}

function exportGrowthLabel(status: Examination["growthStatus"]) {
  if (status === "within_range") return "Sesuai rentang";
  if (status === "monitor") return "Perlu pemantauan";
  if (status === "stunted") return "Stunting";
  if (status === "severely_stunted") return "Stunting berat";
  return "Tidak tersedia";
}

function exportStuntingLabel(exam: Examination) {
  if (exam.measurementQuality === "verified_extreme") {
    return "Nilai ekstrem terverifikasi";
  }
  if (exam.heightForAgeZ === null) return "Tidak tersedia";
  return exam.heightForAgeZ < -2 ? "Stunting" : "Tidak stunting";
}

function exportAgeLabel(ageMonths: number) {
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (years <= 0) return `${months} bulan`;
  if (months === 0) return `${years} tahun`;
  return `${years} tahun ${months} bulan`;
}

function exportMeasurementModeLabel(mode: Examination["measurementMode"]) {
  if (mode === "device") return "Alat otomatis";
  if (mode === "manual_infant") return "Manual PB";
  return "Manual";
}

function exportPhotoUrl(url: string) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  return url.replace(
    "/upload/",
    "/upload/f_jpg,q_auto,w_240,h_240,c_fill,g_face/",
  );
}

async function exportExaminationsExcel(request: Request, env: Env) {
  await requireStaff(request, env);
  const url = new URL(request.url);
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  const period = url.searchParams.get("period") || "all";
  const childId = url.searchParams.get("childId") || "";

  const from = fromRaw ? Number(fromRaw) : null;
  const to = toRaw ? Number(toRaw) : null;
  if (
    (from !== null && (!Number.isFinite(from) || from < 0)) ||
    (to !== null && (!Number.isFinite(to) || to < 0)) ||
    (from !== null && to !== null && from > to)
  ) {
    throw new ApiError(422, "Rentang tanggal export tidak valid.");
  }
  if (childId && !idSchema.safeParse(childId).success) {
    throw new ApiError(422, "Profil anak tidak valid.");
  }

  const db = store(env);
  let docs =
    from !== null
      ? await db.query<ExamRecord>("examinations", {
          where: {
            field: "createdAt",
            op: "GREATER_THAN_OR_EQUAL",
            value: from,
          },
        })
      : await db.query<ExamRecord>("examinations", {
          orderBy: [{ field: "createdAt", direction: "DESCENDING" }],
        });

  docs = docs
    .filter((item) => {
      const at = item.data.completedAt ?? item.data.createdAt;
      return (
        item.data.status === "completed" &&
        (!childId || item.data.childId === childId) &&
        (from === null || at >= from) &&
        (to === null || at <= to)
      );
    })
    .sort((a, b) => {
      const aAt = a.data.completedAt ?? a.data.createdAt;
      const bAt = b.data.completedAt ?? b.data.createdAt;
      return bAt - aAt;
    });

  const fallbackPhotos = new Map<string, string | null>();
  for (const childIdValue of new Set(
    docs
      .filter((item) => !item.data.facePhotoUrl)
      .map((item) => item.data.childId),
  )) {
    const child = await db.get<ChildRecord>(`children/${childIdValue}`);
    fallbackPhotos.set(childIdValue, child?.data.latestFacePhotoUrl ?? null);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StuntSpecula";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("Hasil Pemeriksaan", {
    views: [{ state: "frozen", ySplit: 5 }],
  });

  sheet.mergeCells("A1:O1");
  sheet.getCell("A1").value = "REKAP HASIL PEMERIKSAAN STUNTSPECULA";
  sheet.getCell("A1").font = { size: 16, bold: true };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 26;

  sheet.mergeCells("A2:O2");
  sheet.getCell("A2").value =
    "Sumber antropometri: WHO Child Growth Standards · Foto hanya disertakan bila tersedia.";
  sheet.getCell("A2").font = { size: 10, italic: true };
  sheet.getCell("A2").alignment = { horizontal: "center" };

  sheet.mergeCells("A3:O3");
  sheet.getCell("A3").value = `Dibuat: ${new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  })} · Jumlah data: ${docs.length}`;
  sheet.getCell("A3").font = { size: 10 };
  sheet.getCell("A3").alignment = { horizontal: "center" };

  const columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Foto", key: "photo", width: 14 },
    { header: "Tanggal Pemeriksaan", key: "examDate", width: 22 },
    { header: "Nama Anak", key: "childName", width: 22 },
    { header: "Kode Anak", key: "childCode", width: 18 },
    { header: "Umur Saat Diperiksa", key: "age", width: 20 },
    { header: "Jenis Kelamin", key: "sex", width: 15 },
    { header: "PB/TB (cm)", key: "height", width: 13 },
    { header: "BB (kg)", key: "weight", width: 12 },
    { header: "Z-score PB/TB-U", key: "haz", width: 17 },
    { header: "Z-score BB/U", key: "waz", width: 15 },
    { header: "Status Stunting", key: "stunting", width: 22 },
    { header: "Klasifikasi Pertumbuhan", key: "growth", width: 22 },
    { header: "Metode", key: "mode", width: 17 },
    { header: "Catatan Kualitas", key: "quality", width: 34 },
  ];
  sheet.columns = columns.map(({ key, width }) => ({ key, width }));

  const headerRow = sheet.getRow(5);
  headerRow.values = columns.map((column) => column.header);
  headerRow.height = 30;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2F75B5" },
  };
  sheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: columns.length },
  };

  for (const [index, doc] of docs.entries()) {
    const exam = asExam(doc);
    const examAt = exam.completedAt ?? exam.createdAt;
    const row = sheet.addRow({
      no: index + 1,
      photo: "",
      examDate: new Date(examAt).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }),
      childName: exam.childName,
      childCode: exam.childCode,
      age: exportAgeLabel(exam.ageMonths),
      sex: exam.sex === "male" ? "Laki-laki" : "Perempuan",
      height: exam.heightCm,
      weight: exam.weightKg,
      haz:
        exam.heightForAgeZ === null
          ? "—"
          : Number(exam.heightForAgeZ.toFixed(2)),
      waz:
        exam.weightForAgeZ === null
          ? "—"
          : Number(exam.weightForAgeZ.toFixed(2)),
      stunting: exportStuntingLabel(exam),
      growth: exportGrowthLabel(exam.growthStatus),
      mode: exportMeasurementModeLabel(exam.measurementMode),
      quality:
        exam.measurementReason ||
        (exam.measurementQuality === "valid"
          ? "Pengukuran valid"
          : exam.measurementQuality === "verified_extreme"
            ? "Nilai ekstrem terverifikasi"
            : "Perlu ditinjau"),
    });
    row.height = 72;
    row.alignment = { vertical: "middle", wrapText: true };

    const photoUrl =
      doc.data.facePhotoUrl ?? fallbackPhotos.get(doc.data.childId) ?? null;
    if (photoUrl) {
      try {
        const imageResponse = await fetch(exportPhotoUrl(photoUrl));
        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get("content-type") || "";
          if (
            contentType.includes("jpeg") ||
            contentType.includes("jpg") ||
            contentType.includes("png")
          ) {
            const imageBytes = Buffer.from(
              await imageResponse.arrayBuffer(),
            );
            const imageId = workbook.addImage({
              base64: `data:${contentType};base64,${imageBytes.toString("base64")}`,
              extension: contentType.includes("png") ? "png" : "jpeg",
            });
            sheet.addImage(imageId, {
              tl: { col: 1.15, row: row.number - 0.9 },
              ext: { width: 68, height: 68 },
            });
          }
        }
      } catch {}
    }

    for (let column = 1; column <= columns.length; column += 1) {
      const cell = row.getCell(column);
      cell.border = {
        top: { style: "thin", color: { argb: "FFDCE6EF" } },
        left: { style: "thin", color: { argb: "FFDCE6EF" } },
        bottom: { style: "thin", color: { argb: "FFDCE6EF" } },
        right: { style: "thin", color: { argb: "FFDCE6EF" } },
      };
      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7FBFE" },
        };
      }
    }
  }

  const output = await workbook.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  const safePeriod = period.replace(/[^a-z0-9_-]/gi, "-").slice(0, 30) || "all";
  const filename = `stuntspecula-hasil-${safePeriod}-${today}.xlsx`;

  return new Response(new Uint8Array(output), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

async function startStaffExam(request: Request, env: Env) {
  const actor = await requireStaff(request, env);
  const input = await body(
    request,
    z.object({
      childId: idSchema,
      cameraEnabled: z.boolean().default(true),
      canStand: z.literal(true),
    }),
  );
  const child = await store(env).get<ChildRecord>(`children/${input.childId}`);
  if (!child) throw new ApiError(422, "Pilih profil anak yang tersedia.");
  return ok(
    await createActiveExam(
      env,
      child,
      actor.id,
      child.data.parentId,
      input.cameraEnabled ?? true,
    ),
    201,
  );
}

async function parentStartExam(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  const input = await body(
    request,
    z
      .object({
        childId: idSchema,
        cameraEnabled: z.boolean().default(true),
        canStand: z.literal(true),
      })
      .strict(),
  );
  const child = await store(env).get<ChildRecord>(`children/${input.childId}`);
  if (!child || child.data.parentId !== parent.id) {
    throw new ApiError(404, "Profil anak tidak ditemukan.");
  }

  return ok(
    await createActiveExam(
      env,
      child,
      SYSTEM_SCREENING_STAFF_ID,
      parent.id,
      input.cameraEnabled ?? true,
    ),
    201,
  );
}

async function saveParentManualExamination(
  env: Env,
  parentId: string,
  childId: string,
  linearCm: number,
  weightKg: number,
  legacyInfantOnly: boolean,
  confirmExtreme = false,
) {
  const child = await store(env).get<ChildRecord>(`children/${childId}`);
  if (!child || child.data.parentId !== parentId) {
    throw new ApiError(404, "Profil anak tidak ditemukan.");
  }

  const ageMonths = ageInMonths(child.data.birthDate);
  if (ageMonths < 0 || ageMonths > 59) {
    throw new ApiError(
      422,
      "Pemeriksaan manual ditujukan untuk anak usia 0–59 bulan.",
      "manual_age_out_of_range",
    );
  }
  if (legacyInfantOnly && ageMonths > 23) {
    throw new ApiError(
      422,
      "Input manual panjang badan ditujukan untuk bayi usia 0–23 bulan.",
      "manual_infant_age_out_of_range",
    );
  }

  const anthropometry = assessAnthropometry(
    ageMonths,
    child.data.sex,
    linearCm,
    weightKg,
  );
  const verifiedExtreme =
    anthropometry.measurementQuality === "recheck" && confirmExtreme;
  if (anthropometry.measurementQuality === "recheck" && !verifiedExtreme) {
    throw new ApiError(
      422,
      anthropometry.measurementReason ||
        "Data pengukuran perlu diulang. Jika hasil kedua tetap sama, konfirmasi sebagai nilai ekstrem.",
      "measurement_recheck_required",
    );
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const isInfant = ageMonths <= 23;
  const bmi = isInfant
    ? null
    : Number((weightKg / (linearCm / 100) ** 2).toFixed(1));

  const exam: ExamRecord = {
    childId: child.id,
    childName: child.data.name,
    childCode: child.data.code,
    parentId,
    staffId: SYSTEM_SCREENING_STAFF_ID,
    ageMonths,
    sex: child.data.sex,
    deviceId: legacyInfantOnly ? "manual-infant" : "manual-entry",
    deviceName: legacyInfantOnly
      ? "Input manual bayi"
      : isInfant
        ? "Input manual PB + BB"
        : "Input manual TB + BB",
    measurementMode: legacyInfantOnly ? "manual_infant" : "manual",
    status: "completed",
    cameraEnabled: false,
    heightCm: linearCm,
    weightKg,
    measurementUpdatedAt: now,
    measurementSource: "manual",
    measurementIssue: verifiedExtreme
      ? anthropometry.measurementReason ||
        "Nilai ekstrem dikonfirmasi setelah pengukuran ulang."
      : null,
    measurementIssueAt: verifiedExtreme ? now : null,
    measurementReviewStatus: verifiedExtreme ? "verified_extreme" : "none",
    measurementReviewNote: verifiedExtreme
      ? anthropometry.measurementReason ||
        "Nilai ekstrem dikonfirmasi setelah pengukuran ulang."
      : null,
    measurementReviewedAt: verifiedExtreme ? now : null,
    measurementReviewedBy: verifiedExtreme ? parentId : null,
    cancelledAt: null,
    cancelReason: null,
    cancelledBy: null,
    bmi,
    captureStatus: "skipped",
    facialStatus: "unavailable",
    facialProbability: null,
    facialReason: null,
    facialModelVersion: null,
    visualAnalysis: null,
    recommendations: null,
    createdAt: now,
    completedAt: now,
    finalizedAt: now,
  };

  exam.recommendations = verifiedExtreme
    ? null
    : await recommendationsForExam(
        env,
        { id, data: exam, updateTime: "" },
        linearCm,
        weightKg,
        now,
      );

  await store(env).set(`examinations/${id}`, exam, {
    precondition: { exists: false },
  });

  return asExam(await getExam(env, id));
}

async function parentManualExam(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  await rateLimit(env, `parent-manual:${parent.sessionHash}`, 30, 3600);

  const input = await body(
    request,
    z
      .object({
        childId: idSchema,
        linearCm: z.number().finite().min(30).max(130),
        weightKg: z.number().finite().min(0.5).max(40),
        confirmExtreme: z.boolean().optional().default(false),
      })
      .strict(),
  );

  return ok(
    await saveParentManualExamination(
      env,
      parent.id,
      input.childId,
      input.linearCm,
      input.weightKg,
      false,
      input.confirmExtreme,
    ),
    201,
  );
}

async function parentManualInfantExam(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  await rateLimit(env, `parent-manual-infant:${parent.sessionHash}`, 30, 3600);

  const input = await body(
    request,
    z
      .object({
        childId: idSchema,
        lengthCm: z.number().finite().min(30).max(120),
        weightKg: z.number().finite().min(0.5).max(30),
      })
      .strict(),
  );

  return ok(
    await saveParentManualExamination(
      env,
      parent.id,
      input.childId,
      input.lengthCm,
      input.weightKg,
      true,
    ),
    201,
  );
}

async function finalizeParentExam(request: Request, env: Env, examId: string) {
  const parent = await requireParent(request, env);
  const exam = await getExam(env, examId);
  if (exam.data.parentId !== parent.id) {
    throw new ApiError(404, "Pemeriksaan tidak ditemukan.");
  }
  return ok(await finalizeExam(env, exam));
}

async function cancelParentExam(request: Request, env: Env, examId: string) {
  const parent = await requireParent(request, env);
  const exam = await getExam(env, examId);
  if (exam.data.parentId !== parent.id) {
    throw new ApiError(404, "Pemeriksaan tidak ditemukan.");
  }
  return ok(await cancelExam(env, exam));
}

async function finalizeStaffExam(request: Request, env: Env, examId: string) {
  await requireStaff(request, env);
  return ok(await finalizeExam(env, await getExam(env, examId)));
}

async function cancelStaffExam(request: Request, env: Env, examId: string) {
  await requireStaff(request, env);
  return ok(await cancelExam(env, await getExam(env, examId)));
}

async function parentMessages(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  const examId = new URL(request.url).searchParams.get("examId") || "";
  const exam = await getExam(env, examId);
  if (exam.data.parentId !== parent.id || exam.data.status !== "completed") {
    throw new ApiError(404, "Hasil pemeriksaan tidak ditemukan.");
  }

  const messages = (
    await store(env).query<StoredChat>("parentMessages", {
      where: { field: "parentId", op: "EQUAL", value: parent.id },
    })
  )
    .filter((item) => item.data.examId === exam.id)
    .sort((a, b) => a.data.createdAt - b.data.createdAt)
    .slice(0, 40)
    .map((item) => ({
      id: item.id,
      role: item.data.role,
      content: item.data.content,
      createdAt: item.data.createdAt,
    }));

  return ok(messages);
}

async function parentChat(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  const input = await body(
    request,
    z.object({
      examId: idSchema,
      message: z.string().trim().min(1).max(1500),
      consent: z.literal(true),
    }),
  );
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) {
    throw new ApiError(
      503,
      "Asisten sedang tidak tersedia. Hasil pemeriksaan tetap dapat dilihat.",
      "ai_not_configured",
    );
  }

  await rateLimit(env, `parent-chat:${parent.sessionHash}`, 20, 7200);
  await rateLimit(env, `parent-chat-minute:${parent.sessionHash}`, 4, 60);

  const exam = await getExam(env, input.examId);
  if (exam.data.parentId !== parent.id || exam.data.status !== "completed") {
    throw new ApiError(404, "Hasil pemeriksaan tidak ditemukan.");
  }

  const historyResponse = await parentMessages(
    new Request(
      `${env.APP_ORIGIN}/api/parent-account/messages?examId=${exam.id}`,
      { headers: { cookie: request.headers.get("cookie") || "" } },
    ),
    env,
  );
  const historyPayload = (await historyResponse.json()) as {
    data: ChatMessage[];
  };

  let answer: string;
  try {
    answer = await geminiExplainer(env).explain(
      asExam(exam),
      historyPayload.data,
      input.message,
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      503,
      "Asisten belum merespons. Silakan coba lagi.",
      "ai_timeout",
    );
  }

  const now = Date.now();
  const user: StoredChat = {
    id: crypto.randomUUID(),
    parentId: parent.id,
    examId: exam.id,
    role: "user",
    content: input.message,
    createdAt: now,
  };
  const assistant: StoredChat = {
    id: crypto.randomUUID(),
    parentId: parent.id,
    examId: exam.id,
    role: "assistant",
    content: answer,
    createdAt: now + 1,
  };

  await store(env).commit([
    {
      path: `parentMessages/${user.id}`,
      data: user,
      precondition: { exists: false },
    },
    {
      path: `parentMessages/${assistant.id}`,
      data: assistant,
      precondition: { exists: false },
    },
  ]);

  return ok({
    user: {
      id: user.id,
      role: user.role,
      content: user.content,
      createdAt: user.createdAt,
    },
    assistant: {
      id: assistant.id,
      role: assistant.role,
      content: assistant.content,
      createdAt: assistant.createdAt,
    },
  });
}

async function claimActiveExam(env: Env) {
  const { exam } = await activeStation(env);
  if (!exam) {
    throw new ApiError(409, "Belum ada pemeriksaan yang dikirim ke alat.");
  }
  if (exam.data.status === "completed") {
    throw new ApiError(
      409,
      "Pemeriksaan sudah selesai. Menunggu konfirmasi orang tua.",
    );
  }

  if (exam.data.status === "queued") {
    try {
      await store(env).set(
        `examinations/${exam.id}`,
        { status: "running" },
        {
          mergeFields: ["status"],
          precondition: { updateTime: exam.updateTime },
        },
      );
    } catch (error) {
      if (preconditionConflict(error)) {
        const latest = await activeStation(env);
        if (
          latest.exam?.id === exam.id &&
          latest.exam.data.status === "running"
        ) {
          return latest.exam;
        }
        throw new ApiError(409, "Pemeriksaan sudah berubah. Coba lagi.");
      }
      throw error;
    }
  }

  return exam;
}

async function stationStatus(_request: Request, env: Env) {
  const [{ exam }, device] = await Promise.all([
    activeStation(env),
    stationDeviceState(env),
  ]);

  return ok({
    resetToken: device.resetToken,
    resetRequestedAt: device.resetRequestedAt,
    active: exam
      ? {
          examinationId: exam.id,
          status: exam.data.status,
          cameraEnabled: exam.data.cameraEnabled,
          createdAt: exam.data.createdAt,
          heightCm: exam.data.heightCm,
          weightKg: exam.data.weightKg,
          measurementUpdatedAt: exam.data.measurementUpdatedAt ?? null,
          measurementSource: exam.data.measurementSource ?? null,
          measurementIssue: exam.data.measurementIssue ?? null,
          measurementIssueAt: exam.data.measurementIssueAt ?? null,
          stationStep: exam.data.stationStep ?? null,
          stationAttention: exam.data.stationAttention ?? null,
          stationAttentionMessage: exam.data.stationAttentionMessage ?? null,
          stationControlId: exam.data.stationControlId ?? null,
          stationControlAction: exam.data.stationControlAction ?? null,
          stationControlAckId: exam.data.stationControlAckId ?? null,
        }
      : null,
  });
}

const stationStateSchema = z
  .object({
    step: z.enum([
      "camera",
      "prepare",
      "height",
      "weight",
      "analysis",
      "result",
    ]),
    attention: z.enum(["camera_retry_required"]).nullable().optional(),
    message: z.string().trim().max(240).nullable().optional(),
  })
  .strict();

const stationControlAckSchema = z
  .object({
    controlId: z.string().uuid(),
  })
  .strict();

const parentStationControlSchema = z
  .object({
    action: z.enum(["retry_camera", "skip_camera"]),
  })
  .strict();

async function stationStateUpdate(request: Request, env: Env) {
  const input = await body(request, stationStateSchema);
  const { exam } = await activeStation(env);
  if (!exam || exam.data.status !== "running") {
    return ok({ updated: false });
  }

  await store(env).set(
    `examinations/${exam.id}`,
    {
      stationStep: input.step,
      stationAttention: input.attention ?? null,
      stationAttentionMessage: input.message ?? null,
    },
    {
      mergeFields: [
        "stationStep",
        "stationAttention",
        "stationAttentionMessage",
      ],
    },
  );

  return ok({ updated: true });
}

async function stationControlAck(request: Request, env: Env) {
  const input = await body(request, stationControlAckSchema);
  const { exam } = await activeStation(env);
  if (!exam || exam.data.status !== "running") {
    return ok({ acknowledged: false });
  }
  if (exam.data.stationControlId !== input.controlId) {
    return ok({ acknowledged: false });
  }

  await store(env).set(
    `examinations/${exam.id}`,
    {
      stationControlAckId: input.controlId,
      stationAttention: null,
      stationAttentionMessage: null,
    },
    {
      mergeFields: [
        "stationControlAckId",
        "stationAttention",
        "stationAttentionMessage",
      ],
    },
  );

  return ok({ acknowledged: true });
}

async function parentStationControl(
  request: Request,
  env: Env,
  examId: string,
) {
  const parent = await requireParent(request, env);
  const input = await body(request, parentStationControlSchema);
  const exam = await getExam(env, examId);

  if (exam.data.parentId !== parent.id) {
    throw new ApiError(404, "Pemeriksaan tidak ditemukan.");
  }
  if (exam.data.status !== "running") {
    throw new ApiError(409, "Pemeriksaan tidak sedang berjalan.");
  }
  if (!exam.data.cameraEnabled || exam.data.stationStep !== "camera") {
    throw new ApiError(409, "Kontrol kamera tidak tersedia pada tahap ini.");
  }
  if (
    input.action === "retry_camera" &&
    exam.data.stationAttention !== "camera_retry_required"
  ) {
    throw new ApiError(409, "Kamera belum meminta pengambilan ulang.");
  }

  const controlId = crypto.randomUUID();
  await store(env).set(
    `examinations/${exam.id}`,
    {
      stationControlId: controlId,
      stationControlAction: input.action,
      stationControlIssuedAt: Date.now(),
    },
    {
      mergeFields: [
        "stationControlId",
        "stationControlAction",
        "stationControlIssuedAt",
      ],
      precondition: { updateTime: exam.updateTime },
    },
  );

  return ok({
    controlId,
    action: input.action,
    queued: true,
  });
}

async function stationClaim(_request: Request, env: Env) {
  const exam = await claimActiveExam(env);
  return ok({
    id: exam.id,
    ageMonths: exam.data.ageMonths,
    sex: exam.data.sex,
    status: "running",
    cameraEnabled: exam.data.cameraEnabled,
  });
}

async function stationComplete(request: Request, env: Env) {
  const input = await body(request, completionSchema);
  const { exam } = await activeStation(env);
  if (!exam) {
    throw new ApiError(409, "Belum ada pemeriksaan aktif pada alat.");
  }
  if (exam.data.status === "completed") return ok({ saved: true });
  if (exam.data.status !== "running") {
    throw new ApiError(409, "Pemeriksaan belum dimulai.");
  }

  const heightCm =
    exam.data.measurementSource === "iot" && exam.data.heightCm !== null
      ? exam.data.heightCm
      : input.heightCm;
  const weightKg =
    exam.data.measurementSource === "iot" && exam.data.weightKg !== null
      ? exam.data.weightKg
      : input.weightKg;
  const anthropometry = assessAnthropometry(
    exam.data.ageMonths,
    exam.data.sex,
    heightCm,
    weightKg,
  );
  const verifiedExtreme =
    exam.data.measurementReviewStatus === "verified_extreme";
  if (anthropometry.measurementQuality === "recheck" && !verifiedExtreme) {
    throw new ApiError(
      422,
      anthropometry.measurementReason || "Data pengukuran perlu diulang.",
      "measurement_recheck_required",
    );
  }

  const bmi =
    heightCm !== null && weightKg !== null
      ? Number((weightKg / (heightCm / 100) ** 2).toFixed(1))
      : null;
  const completedAt = Date.now();
  const recommendations = verifiedExtreme
    ? null
    : await recommendationsForExam(env, exam, heightCm, weightKg, completedAt);

  try {
    await store(env).set(
      `examinations/${exam.id}`,
      {
        status: "completed",
        heightCm,
        weightKg,
        bmi,
        captureStatus: input.captureStatus,
        facialStatus: input.facialStatus ?? "unavailable",
        facialProbability: input.facialProbability ?? null,
        facialReason: input.facialReason ?? null,
        facialModelVersion: input.facialModelVersion ?? null,
        visualAnalysis: input.visualAnalysis ?? null,
        recommendations,
        stationStep: "result",
        stationAttention: null,
        stationAttentionMessage: null,
        completedAt,
      },
      {
        mergeFields: [
          "status",
          "heightCm",
          "weightKg",
          "bmi",
          "captureStatus",
          "facialStatus",
          "facialProbability",
          "facialReason",
          "facialModelVersion",
          "visualAnalysis",
          "recommendations",
          "completedAt",
        ],
        precondition: { updateTime: exam.updateTime },
      },
    );
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(
        409,
        "Pemeriksaan sudah berubah. Hasil belum disimpan.",
      );
    }
    throw error;
  }

  return ok({ saved: true, recommendations });
}

async function stationCancel(_request: Request, env: Env) {
  const { exam } = await activeStation(env);
  if (!exam || !["queued", "running"].includes(exam.data.status)) {
    return ok({ cancelled: false });
  }
  await cancelExam(env, exam);
  return ok({ cancelled: true });
}

async function iotSession(request: Request, env: Env) {
  requireIotApiKey(request, env);
  await touchIotDevice(env);
  const [{ exam }, device] = await Promise.all([
    activeStation(env),
    stationDeviceState(env),
  ]);

  return ok({
    active: exam
      ? {
          examinationId: exam.id,
          status: exam.data.status,
          ageMonths: exam.data.ageMonths,
          sex: exam.data.sex,
          cameraEnabled: exam.data.cameraEnabled,
          heightCm: exam.data.heightCm,
          weightKg: exam.data.weightKg,
          measurementUpdatedAt: exam.data.measurementUpdatedAt ?? null,
          measurementSource: exam.data.measurementSource ?? null,
          measurementIssue: exam.data.measurementIssue ?? null,
          measurementIssueAt: exam.data.measurementIssueAt ?? null,
        }
      : null,
    claimedExamId: device.claimedExamId,
    needsClaim: !!exam && device.claimedExamId !== exam.id,
    resetToken: device.resetToken,
    resetRequestedAt: device.resetRequestedAt,
    resetReason: device.resetReason,
    mustReset:
      !!device.resetToken && device.appliedResetToken !== device.resetToken,
    serverTime: Date.now(),
  });
}

async function iotClaim(request: Request, env: Env) {
  requireIotApiKey(request, env);
  await touchIotDevice(env);
  const exam = await claimActiveExam(env);
  await bindIotDeviceExam(env, exam.id);
  const device = await stationDeviceState(env);

  return ok({
    examinationId: exam.id,
    status: "running",
    ageMonths: exam.data.ageMonths,
    sex: exam.data.sex,
    cameraEnabled: exam.data.cameraEnabled,
    resetMeasurements: true,
    resetToken: device.resetToken,
  });
}

async function iotMeasurements(request: Request, env: Env) {
  requireIotApiKey(request, env);
  const input = await body(request, iotMeasurementSchema);

  await touchIotDevice(env, {
    heightSensor: input.heightCm !== undefined ? "ok" : undefined,
    weightSensor: input.weightKg !== undefined ? "ok" : undefined,
  });
  const [{ exam }, deviceDoc] = await Promise.all([
    activeStation(env),
    store(env).get<DeviceRecord>(`devices/${STATION_ID}`),
  ]);

  if (!exam || exam.data.status !== "running") {
    throw new ApiError(
      409,
      "Tidak ada pemeriksaan aktif yang menerima data sensor.",
      "iot_session_not_running",
    );
  }

  const boundExamId =
    input.examinationId ?? deviceDoc?.data.claimedExamId ?? null;
  if (boundExamId !== exam.id) {
    throw new ApiError(
      409,
      "Data sensor berasal dari sesi lama atau perangkat belum melakukan claim untuk sesi ini. Reset buffer pengukuran lalu claim ulang.",
      "iot_stale_session",
    );
  }

  const candidateHeight =
    input.heightCm !== undefined ? input.heightCm : exam.data.heightCm;
  const candidateWeight =
    input.weightKg !== undefined ? input.weightKg : exam.data.weightKg;
  const anthropometry = assessAnthropometry(
    exam.data.ageMonths,
    exam.data.sex,
    candidateHeight,
    candidateWeight,
  );
  if (anthropometry.measurementQuality === "recheck") {
    const issue =
      anthropometry.measurementReason || "Data sensor perlu diukur ulang.";
    const issueAt = Date.now();
    const alreadyVerified =
      exam.data.measurementReviewStatus === "verified_extreme";
    const issuePatch = {
      ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
      ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
      measurementUpdatedAt: issueAt,
      measurementSource: "iot" as const,
      measurementIssue: issue,
      measurementIssueAt: issueAt,
      ...(alreadyVerified
        ? {}
        : {
            measurementReviewStatus: "none" as const,
            measurementReviewNote: null,
            measurementReviewedAt: null,
            measurementReviewedBy: null,
          }),
    };

    await store(env).set(`examinations/${exam.id}`, issuePatch, {
      mergeFields: Object.keys(issuePatch),
      precondition: { updateTime: exam.updateTime },
    });

    if (alreadyVerified) {
      return ok({
        saved: true,
        ack: "verified_extreme_measurement_saved",
        examinationId: exam.id,
        accepted: {
          heightCm: input.heightCm !== undefined,
          weightKg: input.weightKg !== undefined,
        },
        heightCm: candidateHeight,
        weightKg: candidateWeight,
        source: "iot",
        measurementUpdatedAt: issueAt,
        verifiedExtreme: true,
        serverTime: issueAt,
      });
    }

    throw new ApiError(422, issue, "measurement_recheck_required");
  }

  const now = Date.now();
  const patch = {
    ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
    ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
    measurementUpdatedAt: now,
    measurementSource: "iot" as const,
    measurementIssue: null,
    measurementIssueAt: null,
    measurementReviewStatus: "none" as const,
    measurementReviewNote: null,
    measurementReviewedAt: null,
    measurementReviewedBy: null,
  };

  try {
    await store(env).set(`examinations/${exam.id}`, patch, {
      mergeFields: Object.keys(patch),
      precondition: { updateTime: exam.updateTime },
    });
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(
        409,
        "Sesi berubah saat data sensor dikirim. Ambil status sesi terbaru lalu kirim ulang hasil final.",
        "iot_measurement_conflict",
      );
    }
    throw error;
  }

  return ok({
    saved: true,
    ack: "measurement_saved",
    examinationId: exam.id,
    accepted: {
      heightCm: input.heightCm !== undefined,
      weightKg: input.weightKg !== undefined,
    },
    heightCm: input.heightCm ?? exam.data.heightCm,
    weightKg: input.weightKg ?? exam.data.weightKg,
    source: "iot",
    measurementUpdatedAt: now,
    serverTime: now,
  });
}

async function iotHeartbeat(request: Request, env: Env) {
  requireIotApiKey(request, env);
  const input = await body(request, iotHeartbeatSchema);
  await touchIotDevice(env, input);
  const device = await stationDeviceState(env);

  return ok({
    online: device.online,
    lastSeen: device.lastSeen,
    heightSensor: device.heightSensor,
    weightSensor: device.weightSensor,
    firmwareVersion: device.firmwareVersion,
    expectedResetToken: device.resetToken,
    appliedResetToken: device.appliedResetToken,
    currentExaminationId: device.currentExaminationId,
    localSessionState: device.localSessionState,
    serverTime: Date.now(),
  });
}

async function iotCancel(request: Request, env: Env) {
  requireIotApiKey(request, env);
  await touchIotDevice(env);
  const { exam } = await activeStation(env);

  if (!exam || !["queued", "running"].includes(exam.data.status)) {
    await bindIotDeviceExam(env, null);
    return ok({ cancelled: false });
  }

  await cancelExam(env, exam);
  return ok({ cancelled: true });
}

async function mirrorAssignment(request: Request, env: Env) {
  const actor = await requireStaff(request, env);
  const exam = (
    await store(env).query<ExamRecord>("examinations", {
      where: { field: "staffId", op: "EQUAL", value: actor.id },
    })
  )
    .sort(byCreatedDesc)
    .find((item) => ["queued", "running"].includes(item.data.status));
  return ok({
    assignment: exam
      ? {
          id: exam.id,
          ageMonths: exam.data.ageMonths,
          sex: exam.data.sex,
          status: exam.data.status,
          cameraEnabled: exam.data.cameraEnabled,
        }
      : null,
  });
}

async function staffClaim(request: Request, env: Env, examId: string) {
  const actor = await requireStaff(request, env);
  const exam = await getExam(env, examId);
  if (exam.data.staffId !== actor.id) {
    throw new ApiError(409, "Sesi tidak aktif. Hubungi petugas.");
  }
  if (!["queued", "running"].includes(exam.data.status)) {
    throw new ApiError(409, "Sesi tidak aktif. Hubungi petugas.");
  }
  if (exam.data.status === "queued") {
    await store(env).set(
      `examinations/${exam.id}`,
      { status: "running" },
      {
        mergeFields: ["status"],
        precondition: { updateTime: exam.updateTime },
      },
    );
  }
  return ok({
    id: exam.id,
    ageMonths: exam.data.ageMonths,
    sex: exam.data.sex,
    status: "running",
    cameraEnabled: exam.data.cameraEnabled,
  });
}

async function staffComplete(request: Request, env: Env, examId: string) {
  const actor = await requireStaff(request, env);
  const exam = await getExam(env, examId);
  if (exam.data.staffId !== actor.id) {
    throw new ApiError(404, "Pemeriksaan tidak ditemukan.");
  }
  if (exam.data.status === "completed") return ok({ id: exam.id, saved: true });
  if (exam.data.status !== "running") {
    throw new ApiError(409, "Sesi sudah dibatalkan. Hasil tidak disimpan.");
  }

  const input = await body(request, completionSchema);
  const heightCm =
    exam.data.measurementSource === "iot" && exam.data.heightCm !== null
      ? exam.data.heightCm
      : input.heightCm;
  const weightKg =
    exam.data.measurementSource === "iot" && exam.data.weightKg !== null
      ? exam.data.weightKg
      : input.weightKg;
  const anthropometry = assessAnthropometry(
    exam.data.ageMonths,
    exam.data.sex,
    heightCm,
    weightKg,
  );
  const verifiedExtreme =
    exam.data.measurementReviewStatus === "verified_extreme";
  if (anthropometry.measurementQuality === "recheck" && !verifiedExtreme) {
    throw new ApiError(
      422,
      anthropometry.measurementReason || "Data pengukuran perlu diulang.",
      "measurement_recheck_required",
    );
  }

  const bmi =
    heightCm !== null && weightKg !== null
      ? Number((weightKg / (heightCm / 100) ** 2).toFixed(1))
      : null;
  const completedAt = Date.now();
  const recommendations = verifiedExtreme
    ? null
    : await recommendationsForExam(env, exam, heightCm, weightKg, completedAt);
  await store(env).set(
    `examinations/${exam.id}`,
    {
      status: "completed",
      heightCm,
      weightKg,
      bmi,
      captureStatus: input.captureStatus,
      facialStatus: input.facialStatus ?? "unavailable",
      facialProbability: input.facialProbability ?? null,
      facialReason: input.facialReason ?? null,
      facialModelVersion: input.facialModelVersion ?? null,
      visualAnalysis: input.visualAnalysis ?? null,
      recommendations,
      completedAt,
    },
    {
      mergeFields: [
        "status",
        "heightCm",
        "weightKg",
        "bmi",
        "captureStatus",
        "facialStatus",
        "facialProbability",
        "facialReason",
        "facialModelVersion",
        "visualAnalysis",
        "recommendations",
        "completedAt",
      ],
      precondition: { updateTime: exam.updateTime },
    },
  );
  return ok({ id: exam.id, saved: true, recommendations });
}

async function staffMirrorCancel(request: Request, env: Env, examId: string) {
  const actor = await requireStaff(request, env);
  const exam = await getExam(env, examId);
  if (exam.data.staffId !== actor.id) return ok();
  if (["queued", "running"].includes(exam.data.status)) {
    await cancelExam(env, exam);
  }
  return ok();
}

async function forceStopDeviceSession(request: Request, env: Env) {
  const actor = await requireStaff(request, env, true);
  await rateLimit(env, `device-force-stop:${actor.id}`, 8, 60);
  const { exam } = await activeStation(env);

  if (exam && ["queued", "running"].includes(exam.data.status)) {
    const result = await cancelExam(env, exam, "admin_force_stop", actor.id);
    return ok({
      stopped: true,
      examinationId: exam.id,
      ...result,
      message:
        "Sesi dihentikan di server. Menunggu alat menerapkan reset token terbaru.",
    });
  }

  const reset = await requestIotDeviceReset(
    env,
    "admin_force_stop_no_active_session",
    null,
  );
  return ok({
    stopped: false,
    examinationId: null,
    deviceResetPending: true,
    ...reset,
    message:
      "Tidak ada sesi aktif di server. Perintah reset tetap dikirim untuk membersihkan state lokal alat.",
  });
}

async function confirmExtremeMeasurement(request: Request, env: Env) {
  const actor = await requireStaff(request, env, true);
  const input = await body(
    request,
    z.object({ examinationId: idSchema }).strict(),
  );
  const exam = await getExam(env, input.examinationId);
  if (!["queued", "running"].includes(exam.data.status)) {
    throw new ApiError(409, "Sesi ini tidak lagi aktif.");
  }

  const assessment = assessAnthropometry(
    exam.data.ageMonths,
    exam.data.sex,
    exam.data.heightCm,
    exam.data.weightKg,
  );
  if (assessment.measurementQuality !== "recheck") {
    throw new ApiError(
      409,
      "Nilai saat ini tidak memerlukan konfirmasi ekstrem.",
    );
  }

  const now = Date.now();
  await store(env).set(
    `examinations/${exam.id}`,
    {
      measurementReviewStatus: "verified_extreme",
      measurementReviewNote:
        assessment.measurementReason ||
        "Nilai ekstrem dikonfirmasi setelah pengukuran ulang.",
      measurementReviewedAt: now,
      measurementReviewedBy: actor.id,
    },
    {
      mergeFields: [
        "measurementReviewStatus",
        "measurementReviewNote",
        "measurementReviewedAt",
        "measurementReviewedBy",
      ],
      precondition: { updateTime: exam.updateTime },
    },
  );

  return ok({
    confirmed: true,
    examinationId: exam.id,
    message:
      "Nilai ekstrem ditandai terverifikasi. Nilai mentah tetap disimpan, tetapi sistem tidak memaksakan status pertumbuhan otomatis dari nilai tersebut.",
  });
}

async function cleanupStuckDeviceSessions(request: Request, env: Env) {
  const actor = await requireStaff(request, env, true);
  await rateLimit(env, `device-cleanup-stuck:${actor.id}`, 5, 60);
  const db = store(env);
  const [{ exam: activeExam }, recent] = await Promise.all([
    activeStation(env),
    db.query<ExamRecord>("examinations", {
      orderBy: [{ field: "createdAt", direction: "DESCENDING" }],
      limit: 100,
    }),
  ]);
  const stuck = recent.filter(
    (item) =>
      ["queued", "running"].includes(item.data.status) &&
      item.id !== activeExam?.id,
  );
  const now = Date.now();

  if (stuck.length) {
    await db.commit(
      stuck.map(
        (item): FirestoreWrite => ({
          path: `examinations/${item.id}`,
          data: {
            status: "cancelled",
            finalizedAt: now,
            cancelledAt: now,
            cancelReason: "admin_stuck_session_cleanup",
            cancelledBy: actor.id,
          },
          mergeFields: [
            "status",
            "finalizedAt",
            "cancelledAt",
            "cancelReason",
            "cancelledBy",
          ],
          precondition: { updateTime: item.updateTime },
        }),
      ),
    );
  }

  return ok({
    cleaned: stuck.length,
    message: stuck.length
      ? `${stuck.length} sesi tersembunyi/nyangkut ditandai batal tanpa menghapus riwayat audit.`
      : "Tidak ada sesi tersembunyi yang perlu dibersihkan.",
  });
}

async function monitoringOverview(request: Request, env: Env) {
  await requireStaff(request, env);
  const rawSince = new URL(request.url).searchParams.get("since");
  const since = rawSince ? Number(rawSince) : Date.now() - DAY;
  if (!Number.isInteger(since) || since < 0 || since > Date.now() + 60_000) {
    throw new ApiError(422, "Rentang monitoring tidak valid.");
  }

  const db = store(env);
  const [childrenTotal, today, recentDocs, active] = await Promise.all([
    totalChildren(env),
    db.query<ExamRecord>("examinations", {
      where: { field: "createdAt", op: "GREATER_THAN_OR_EQUAL", value: since },
    }),
    db.query<ExamRecord>("examinations", {
      orderBy: [{ field: "createdAt", direction: "DESCENDING" }],
      limit: 8,
    }),
    activeStation(env),
  ]);
  const activeExam = active.exam;
  const recent = recentDocs.map((item) => ({
    id: item.id,
    childName: item.data.childName,
    ageMonths: item.data.ageMonths,
    sex: item.data.sex,
    status: item.data.status,
    heightCm: item.data.heightCm,
    weightKg: item.data.weightKg,
    createdAt: item.data.createdAt,
    completedAt: item.data.completedAt,
    finalizedAt: item.data.finalizedAt,
  }));

  return ok({
    stats: {
      totalChildren: childrenTotal,
      todayExaminations: today.length,
      todayCompleted: today.filter((item) => item.data.status === "completed")
        .length,
      activeSessions: activeExam ? 1 : 0,
    },
    active: activeExam
      ? [
          {
            id: activeExam.id,
            status:
              activeExam.data.status === "completed"
                ? "awaiting_confirmation"
                : activeExam.data.status === "running"
                  ? "running"
                  : "ready",
            childName: activeExam.data.childName,
            ageMonths: activeExam.data.ageMonths,
            examStatus: activeExam.data.status,
            createdAt: activeExam.data.createdAt,
            connectedAt: null,
            startedAt:
              activeExam.data.status === "running"
                ? activeExam.data.createdAt
                : null,
          },
        ]
      : [],
    recent,
  });
}

async function deviceMonitoring(request: Request, env: Env) {
  await requireStaff(request, env, true);
  const [{ exam, station }, device] = await Promise.all([
    activeStation(env),
    stationDeviceState(env),
  ]);
  const stuckSessions: Array<{
    id: string;
    childName: string;
    status: "queued" | "running";
    createdAt: number;
  }> = [];
  const resetPending =
    !!device.resetToken && device.appliedResetToken !== device.resetToken;
  const deviceSessionKnown =
    device.currentExaminationId !== null ||
    device.localSessionState !== "unknown";
  const stateMismatch =
    resetPending ||
    (deviceSessionKnown &&
      (!exam
        ? !!device.currentExaminationId ||
          device.localSessionState === "measuring" ||
          device.localSessionState === "queued"
        : !!device.currentExaminationId &&
          device.currentExaminationId !== exam.id));

  return ok({
    debug: {
      serverActiveExamId: exam?.id ?? null,
      stationActiveExamId: station?.data.activeExamId ?? null,
      deviceClaimedExamId: device.claimedExamId,
      deviceCurrentExamId: device.currentExaminationId,
      deviceLocalSessionState: device.localSessionState,
      wifiConnected: device.wifiConnected,
      expectedResetToken: device.resetToken,
      appliedResetToken: device.appliedResetToken,
      resetRequestedAt: device.resetRequestedAt,
      resetReason: device.resetReason,
      resetPending,
      stateMismatch,
      stuckSessions,
    },
    devices: [
      {
        id: STATION_ID,
        name: device.name,
        online: device.online,
        lastSeen: device.lastSeen,
        firmwareVersion: device.firmwareVersion,
        resetRequestedAt: device.resetRequestedAt,
        status: !device.online
          ? "offline"
          : exam?.data.status === "running"
            ? "in_use"
            : exam
              ? "assigned"
              : "ready",
        examination: exam
          ? {
              status: exam.data.status,
              createdAt: exam.data.createdAt,
              childName: exam.data.childName,
              heightCm: exam.data.heightCm,
              weightKg: exam.data.weightKg,
              measurementUpdatedAt: exam.data.measurementUpdatedAt ?? null,
              measurementSource: exam.data.measurementSource ?? null,
              measurementIssue: exam.data.measurementIssue ?? null,
              measurementIssueAt: exam.data.measurementIssueAt ?? null,
              measurementReviewStatus:
                exam.data.measurementReviewStatus ?? "none",
              measurementReviewNote: exam.data.measurementReviewNote ?? null,
            }
          : null,
        checks: {
          application: device.online ? "normal" : "offline",
          heightSensor: !device.online
            ? "offline"
            : device.heightSensor === "ok"
              ? "normal"
              : "pending_hardware",
          weightSensor: !device.online
            ? "offline"
            : device.weightSensor === "ok"
              ? "normal"
              : "pending_hardware",
          camera: device.online ? "app_ready" : "offline",
        },
      },
    ],
    generatedAt: Date.now(),
  });
}

async function insights(request: Request, env: Env) {
  await requireStaff(request, env);
  const now = Date.now();
  const currentStart = now - 30 * DAY;
  const previousStart = now - 60 * DAY;
  const db = store(env);
  const [examDocs, parents] = await Promise.all([
    db.query<ExamRecord>("examinations", {
      where: {
        field: "createdAt",
        op: "GREATER_THAN_OR_EQUAL",
        value: previousStart,
      },
    }),
    db.query<ParentRecord>("parents", {
      where: { field: "active", op: "EQUAL", value: true },
    }),
  ]);
  const exams = examDocs.filter((item) => item.data.status === "completed");

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

  for (const item of exams) {
    const exam = item.data;
    const result = assessAnthropometry(
      exam.ageMonths,
      exam.sex,
      exam.heightCm,
      exam.weightKg,
    );
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

  const current = exams.filter((item) => item.data.createdAt >= currentStart);
  const previous = exams.filter(
    (item) =>
      item.data.createdAt >= previousStart &&
      item.data.createdAt < currentStart,
  );

  return ok({
    periodDays: 30,
    activity: {
      examinations: current.length,
      completed: current.length,
      previousExaminations: previous.length,
      activeParents: parents.length,
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

async function health(env: Env) {
  try {
    await store(env).list("staff", 1);
    return ok({
      service: "stuntspecula",
      ready: true,
      databaseReady: true,
      databaseProvider: "firestore",
      modelASchemaReady: true,
    });
  } catch {
    return ok(
      {
        service: "stuntspecula",
        ready: false,
        databaseReady: false,
        databaseProvider: "firestore",
        modelASchemaReady: true,
      },
      503,
    );
  }
}

export async function routeFirestore(
  request: Request,
  env: Env,
  path: string,
  method: string,
): Promise<Response> {
  const key = `${method} ${path}`;

  switch (key) {
    case "GET /api/health":
      return health(env);
    case "GET /api/config":
      return authConfig(request, env);
    case "POST /api/auth/setup":
      return setup(request, env);
    case "POST /api/auth/login":
      return staffLogin(request, env);
    case "POST /api/auth/unified-login":
      return unifiedLogin(request, env);
    case "GET /api/auth/google/start":
      return googleOAuthStart(request, env);
    case "GET /api/auth/google/callback":
      return googleOAuthCallback(request, env);
    case "GET /api/auth/google/pending":
      return googleRegistrationStatus(request, env);
    case "POST /api/auth/logout":
      return staffLogout(request, env);
    case "GET /api/auth/me":
      return ok(await requireStaff(request, env));
    case "GET /api/staff":
      return listStaff(request, env);
    case "POST /api/staff":
      return createStaff(request, env);
    case "GET /api/monitoring":
      return monitoringOverview(request, env);
    case "GET /api/device-monitoring":
      return deviceMonitoring(request, env);
    case "GET /api/examinations/export":
      return exportExaminationsExcel(request, env);
    case "POST /api/device/reset-session":
      return resetDeviceSession(request, env);
    case "POST /api/device/force-stop":
      return forceStopDeviceSession(request, env);
    case "POST /api/device/confirm-extreme":
      return confirmExtremeMeasurement(request, env);
    case "POST /api/device/cleanup-stuck-sessions":
      return cleanupStuckDeviceSessions(request, env);
    case "GET /api/insights":
      return insights(request, env);
    case "GET /api/blogs":
      return parentBlogs(request, env);
    case "GET /api/staff/blogs":
      return staffBlogs(request, env);
    case "POST /api/staff/blogs":
      return createBlog(request, env);
    case "GET /api/children":
      return staffChildren(request, env);
    case "POST /api/children":
      return createChild(request, env);
    case "GET /api/examinations":
      return staffExams(request, env);
    case "POST /api/examinations":
      return startStaffExam(request, env);
    case "GET /api/mirror/assignment":
      return mirrorAssignment(request, env);
    case "GET /api/station/active":
      return stationStatus(request, env);
    case "POST /api/station/claim":
      return stationClaim(request, env);
    case "POST /api/station/state":
      return stationStateUpdate(request, env);
    case "POST /api/station/control-ack":
      return stationControlAck(request, env);
    case "POST /api/station/complete":
      return stationComplete(request, env);
    case "POST /api/station/cancel":
      return stationCancel(request, env);
    case "POST /api/station/face-photo":
      return uploadLatestFacePhoto(request, env);
    case "GET /api/iot/session":
      return iotSession(request, env);
    case "POST /api/iot/session/claim":
      return iotClaim(request, env);
    case "POST /api/iot/measurements":
      return iotMeasurements(request, env);
    case "POST /api/iot/heartbeat":
      return iotHeartbeat(request, env);
    case "POST /api/iot/session/cancel":
      return iotCancel(request, env);
    case "POST /api/parent-account/register":
      return registerParent(request, env);
    case "POST /api/parent-account/register-google":
      return registerParentWithGoogle(request, env);
    case "POST /api/parent-account/login":
      return parentLogin(request, env);
    case "POST /api/parent-account/logout":
      return parentLogout(request, env);
    case "GET /api/parent-account/me":
      return parentView(request, env);
    case "GET /api/parent-account/active-exam":
      return parentActiveExam(request, env);
    case "POST /api/parent-account/children":
      return createParentChild(request, env);
    case "PATCH /api/parent-account/profile":
      return updateParentProfile(request, env);
    case "POST /api/uploads/profile-photo":
      return uploadParentProfilePhoto(request, env);
    case "GET /api/parent-account/messages":
      return parentMessages(request, env);
    case "POST /api/parent-account/chat":
      return parentChat(request, env);
    case "POST /api/parent-account/examinations":
      return parentStartExam(request, env);
    case "POST /api/parent-account/examinations/manual":
      return parentManualExam(request, env);
    case "POST /api/parent-account/examinations/manual-infant":
      return parentManualInfantExam(request, env);
  }

  const parentChild = path.match(/^\/api\/parent-account\/children\/([^/]+)$/);
  if (parentChild && method === "PATCH") {
    const parsed = idSchema.safeParse(parentChild[1]);
    if (!parsed.success) {
      throw new ApiError(404, "Halaman tidak ditemukan.");
    }
    return updateParentChild(request, env, parsed.data);
  }

  const blogPost = path.match(/^\/api\/(staff\/)?blogs\/([^/]+)$/);
  if (blogPost) {
    const [, staffPrefix, rawId] = blogPost;
    const parsed = idSchema.safeParse(rawId);
    if (!parsed.success) throw new ApiError(404, "Halaman tidak ditemukan.");

    if (staffPrefix) {
      if (method === "GET") return staffBlog(request, env, parsed.data);
      if (method === "PATCH") return updateBlog(request, env, parsed.data);
      if (method === "DELETE") return deleteBlog(request, env, parsed.data);
    } else if (method === "GET") {
      return parentBlog(request, env, parsed.data);
    }
  }

  const parentExam = path.match(
    /^\/api\/parent-account\/examinations\/([^/]+)\/(finalize|cancel|control)$/,
  );
  if (parentExam && method === "POST") {
    const parsed = idSchema.safeParse(parentExam[1]);
    if (!parsed.success) throw new ApiError(404, "Halaman tidak ditemukan.");
    if (parentExam[2] === "finalize") {
      return finalizeParentExam(request, env, parsed.data);
    }
    if (parentExam[2] === "control") {
      return parentStationControl(request, env, parsed.data);
    }
    return cancelParentExam(request, env, parsed.data);
  }

  const dynamic = path.match(
    /^\/api\/(staff|examinations|mirror\/examinations)\/([^/]+)(?:\/(claim|complete|cancel|finalize|access))?$/,
  );
  if (dynamic) {
    const [, resource, rawId, action] = dynamic;
    const parsed = idSchema.safeParse(rawId);
    if (!parsed.success) throw new ApiError(404, "Halaman tidak ditemukan.");
    const id = parsed.data;

    if (resource === "staff" && method === "PATCH" && !action) {
      return setStaffActive(request, env, id);
    }
    if (resource === "examinations") {
      if (method === "GET" && !action) {
        await requireStaff(request, env);
        return ok(asExam(await getExam(env, id)));
      }
      if (method === "DELETE" && !action) {
        return cancelStaffExam(request, env, id);
      }
      if (method === "POST" && action === "finalize") {
        return finalizeStaffExam(request, env, id);
      }
      if (action === "access") {
        throw new ApiError(
          410,
          "Tautan QR lama tidak digunakan pada portal akun orang tua.",
          "legacy_flow_disabled",
        );
      }
    }
    if (resource === "mirror/examinations" && method === "POST") {
      if (action === "claim") return staffClaim(request, env, id);
      if (action === "complete") return staffComplete(request, env, id);
      if (action === "cancel") return staffMirrorCancel(request, env, id);
    }
  }

  if (path.startsWith("/api/screening/") || path.startsWith("/api/parent/")) {
    throw new ApiError(
      410,
      "Alur lama sudah dinonaktifkan setelah migrasi Firestore.",
      "legacy_flow_disabled",
    );
  }

  throw new ApiError(404, "Layanan tidak ditemukan.");
}
