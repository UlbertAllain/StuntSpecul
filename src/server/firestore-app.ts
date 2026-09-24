import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  ChildProfile,
  ChatMessage,
  Examination,
  Staff,
} from "../lib/portal";
import { ageInMonths, childProfileSchema } from "../lib/portal";
import { assessHeightForAge } from "../lib/growth";
import type { Env } from "./env";
import {
  FirestoreError,
  type FirestoreDoc,
  type FirestoreRest,
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
const ONLINE_WINDOW_MS = 15_000;
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
  status: "queued" | "running" | "completed" | "cancelled";
  cameraEnabled: boolean;
  heightCm: number | null;
  weightKg: number | null;
  measurementUpdatedAt: number | null;
  measurementSource: "iot" | null;
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
  createdAt: number;
};

type StoredChat = ChatMessage & {
  parentId: string;
  examId: string;
};

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
    birthDate: doc.data.birthDate,
    sex: doc.data.sex,
    guardian: doc.data.guardian,
    createdAt: doc.data.createdAt,
  };
}

function asExam(doc: FirestoreDoc<ExamRecord>): Examination {
  const value = doc.data;
  const growth = assessHeightForAge(value.ageMonths, value.sex, value.heightCm);

  return {
    id: doc.id,
    childId: value.childId,
    childName: value.childName,
    childCode: value.childCode,
    ageMonths: value.ageMonths,
    sex: value.sex,
    deviceId: value.deviceId,
    deviceName: value.deviceName,
    status: value.status,
    heightCm: value.heightCm,
    weightKg: value.weightKg,
    bmi: value.bmi,
    heightForAgeZ: growth.heightForAgeZ,
    captureStatus: value.captureStatus,
    facialStatus: value.facialStatus,
    facialProbability: value.facialProbability,
    facialReason: value.facialReason,
    facialModelVersion: value.facialModelVersion,
    growthStatus: growth.growthStatus,
    createdAt: value.createdAt,
    completedAt: value.completedAt,
    finalizedAt: value.finalizedAt,
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
    birthDate: input.child.birthDate,
    sex: input.child.sex,
    guardian: pending.name,
    createdAt: now,
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
    ]);
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(409, "Email atau profil sudah terdaftar.");
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

async function listChildren(env: Env) {
  return (await store(env).list<ChildRecord>("children")).sort(byCreatedDesc);
}

async function listExams(env: Env) {
  return (await store(env).list<ExamRecord>("examinations")).sort(
    byCreatedDesc,
  );
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
};

async function touchIotDevice(env: Env, heartbeat: DeviceHeartbeat = {}) {
  const db = store(env);
  const path = `devices/${STATION_ID}`;
  const current = await db.get<DeviceRecord>(path);
  const now = Date.now();
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

  if (current) {
    await db.set(path, patch, {
      mergeFields: Object.keys(patch),
    });
    return;
  }

  await db.set(path, {
    ...patch,
    firmwareVersion: patch.firmwareVersion ?? null,
    heightSensor: patch.heightSensor ?? "unknown",
    weightSensor: patch.weightSensor ?? "unknown",
    createdAt: now,
  });
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
  };
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
    status: "queued",
    cameraEnabled,
    heightCm: null,
    weightKg: null,
    measurementUpdatedAt: null,
    measurementSource: null,
    bmi: null,
    captureStatus: cameraEnabled ? null : "skipped",
    facialStatus: null,
    facialProbability: null,
    facialReason: null,
    facialModelVersion: null,
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

async function cancelExam(env: Env, exam: FirestoreDoc<ExamRecord>) {
  if (!["queued", "running"].includes(exam.data.status)) {
    throw new ApiError(409, "Sesi ini sudah selesai.");
  }
  const now = Date.now();
  await store(env).set(
    `examinations/${exam.id}`,
    { status: "cancelled", finalizedAt: now },
    {
      mergeFields: ["status", "finalizedAt"],
      precondition: { updateTime: exam.updateTime },
    },
  );
  await clearStationIfMatches(env, exam.id);
  return { id: exam.id, cancelled: true };
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
  })
  .strict();

const iotMeasurementSchema = z
  .object({
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
    birthDate: input.child.birthDate,
    sex: input.child.sex,
    guardian: input.name,
    createdAt: now,
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
    ]);
  } catch (error) {
    if (preconditionConflict(error)) {
      throw new ApiError(409, "Email atau profil sudah terdaftar.");
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

async function parentView(request: Request, env: Env) {
  const parent = await requireParent(request, env);
  const children = (await listChildren(env))
    .filter((item) => item.data.parentId === parent.id)
    .sort((a, b) => a.data.createdAt - b.data.createdAt)
    .map(asChild);
  const exams = (await listExams(env))
    .filter((item) => item.data.parentId === parent.id)
    .slice(0, 100)
    .map(asExam);

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

  const values = (await listChildren(env))
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
    code: input.code.toUpperCase(),
    createdAt: Date.now(),
    parentId: null,
  };
  await store(env).set(`children/${id}`, value, {
    precondition: { exists: false },
  });
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

  const exams = (await listExams(env))
    .filter((item) => !childId || item.data.childId === childId)
    .slice(page * 50, page * 50 + 50)
    .map(asExam);
  return ok(exams);
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

  const messages = (await store(env).list<StoredChat>("parentMessages"))
    .filter(
      (item) =>
        item.data.parentId === parent.id && item.data.examId === exam.id,
    )
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
    active: exam
      ? {
          status: exam.data.status,
          cameraEnabled: exam.data.cameraEnabled,
          createdAt: exam.data.createdAt,
          heightCm: exam.data.heightCm,
          weightKg: exam.data.weightKg,
          measurementUpdatedAt: exam.data.measurementUpdatedAt ?? null,
        }
      : null,
    device,
  });
}

async function stationClaim(_request: Request, env: Env) {
  const exam = await claimActiveExam(env);
  return ok({
    id: "station-active",
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
  const bmi =
    heightCm !== null && weightKg !== null
      ? Number((weightKg / (heightCm / 100) ** 2).toFixed(1))
      : null;

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
        completedAt: Date.now(),
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

  return ok({ saved: true });
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
  const { exam } = await activeStation(env);

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
        }
      : null,
    serverTime: Date.now(),
  });
}

async function iotClaim(request: Request, env: Env) {
  requireIotApiKey(request, env);
  await touchIotDevice(env);
  const exam = await claimActiveExam(env);

  return ok({
    examinationId: exam.id,
    status: "running",
    ageMonths: exam.data.ageMonths,
    sex: exam.data.sex,
    cameraEnabled: exam.data.cameraEnabled,
  });
}

async function iotMeasurements(request: Request, env: Env) {
  requireIotApiKey(request, env);
  const input = await body(request, iotMeasurementSchema);

  await touchIotDevice(env, {
    heightSensor: input.heightCm !== undefined ? "ok" : undefined,
    weightSensor: input.weightKg !== undefined ? "ok" : undefined,
  });

  const { exam } = await activeStation(env);
  if (!exam || exam.data.status !== "running") {
    throw new ApiError(
      409,
      "Tidak ada pemeriksaan aktif yang menerima data sensor.",
      "iot_session_not_running",
    );
  }

  const now = Date.now();
  const patch = {
    ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
    ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
    measurementUpdatedAt: now,
    measurementSource: "iot" as const,
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
        "Sesi berubah saat data sensor dikirim. Coba kirim ulang.",
        "iot_measurement_conflict",
      );
    }
    throw error;
  }

  return ok({
    saved: true,
    examinationId: exam.id,
    heightCm: input.heightCm ?? exam.data.heightCm,
    weightKg: input.weightKg ?? exam.data.weightKg,
    updatedAt: now,
  });
}

async function iotHeartbeat(request: Request, env: Env) {
  requireIotApiKey(request, env);
  const input = await body(request, iotHeartbeatSchema);
  await touchIotDevice(env, input);
  const device = await stationDeviceState(env);

  return ok({
    online: device.online,
    serverTime: Date.now(),
  });
}

async function iotCancel(request: Request, env: Env) {
  requireIotApiKey(request, env);
  await touchIotDevice(env);
  const { exam } = await activeStation(env);

  if (!exam || !["queued", "running"].includes(exam.data.status)) {
    return ok({ cancelled: false });
  }

  await cancelExam(env, exam);
  return ok({ cancelled: true });
}

async function mirrorAssignment(request: Request, env: Env) {
  const actor = await requireStaff(request, env);
  const exam = (await listExams(env)).find(
    (item) =>
      item.data.staffId === actor.id &&
      ["queued", "running"].includes(item.data.status),
  );
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
  const bmi =
    heightCm !== null && weightKg !== null
      ? Number((weightKg / (heightCm / 100) ** 2).toFixed(1))
      : null;
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
      completedAt: Date.now(),
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
        "completedAt",
      ],
      precondition: { updateTime: exam.updateTime },
    },
  );
  return ok({ id: exam.id, saved: true });
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

async function monitoringOverview(request: Request, env: Env) {
  await requireStaff(request, env);
  const rawSince = new URL(request.url).searchParams.get("since");
  const since = rawSince ? Number(rawSince) : Date.now() - DAY;
  if (!Number.isInteger(since) || since < 0 || since > Date.now() + 60_000) {
    throw new ApiError(422, "Rentang monitoring tidak valid.");
  }

  const children = await listChildren(env);
  const exams = await listExams(env);
  const today = exams.filter((item) => item.data.createdAt >= since);
  const { exam: activeExam } = await activeStation(env);
  const recent = exams.slice(0, 8).map((item) => ({
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
      totalChildren: children.length,
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
  const [{ exam }, device] = await Promise.all([
    activeStation(env),
    stationDeviceState(env),
  ]);

  return ok({
    devices: [
      {
        id: STATION_ID,
        name: device.name,
        online: device.online,
        lastSeen: device.lastSeen,
        firmwareVersion: device.firmwareVersion,
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
  const exams = (await listExams(env)).filter(
    (item) =>
      item.data.status === "completed" && item.data.createdAt >= previousStart,
  );

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

  const parents = (await store(env).list<ParentRecord>("parents")).filter(
    (item) => item.data.active,
  );
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
    case "GET /api/insights":
      return insights(request, env);
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
    case "POST /api/station/complete":
      return stationComplete(request, env);
    case "POST /api/station/cancel":
      return stationCancel(request, env);
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
  }

  const parentExam = path.match(
    /^\/api\/parent-account\/examinations\/([^/]+)\/(finalize|cancel)$/,
  );
  if (parentExam && method === "POST") {
    const parsed = idSchema.safeParse(parentExam[1]);
    if (!parsed.success) throw new ApiError(404, "Halaman tidak ditemukan.");
    return parentExam[2] === "finalize"
      ? finalizeParentExam(request, env, parsed.data)
      : cancelParentExam(request, env, parsed.data);
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
