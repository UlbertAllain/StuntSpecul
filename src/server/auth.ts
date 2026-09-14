import { z } from "zod";
import type { Staff } from "../lib/portal";
import type { Env } from "./env";
import { ApiError, body, cookie, ok, sessionCookie } from "./http";
import {
  digest,
  emailSchema,
  hashPassword,
  nameSchema,
  passwordSchema,
  rateLimit,
  requestKey,
  token,
  verifyPassword,
} from "./security";

export const STAFF_COOKIE = "ss_staff";
const STAFF_SECONDS = 8 * 60 * 60;
function isSetupOwner(request: Request, env: Env) {
  // Only configure these allowlists on a deployment whose dispatcher verifies and replaces identity headers.
  return (
    (!!env.SETUP_OWNER_ID &&
      request.headers.get("oai-authenticated-user-id") ===
        env.SETUP_OWNER_ID) ||
    (!!env.SETUP_OWNER_EMAIL &&
      request.headers.get("oai-authenticated-user-email")?.toLowerCase() ===
        env.SETUP_OWNER_EMAIL.toLowerCase())
  );
}
function canInitialize(request: Request, env: Env) {
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const origin = env.APP_ORIGIN && new URL(env.APP_ORIGIN);
  return (
    isSetupOwner(request, env) ||
    !!(
      origin &&
      loopback.has(origin.hostname) &&
      loopback.has(new URL(request.url).hostname)
    )
  );
}
const staffFields = "s.id,s.name,s.email,s.role,s.active";

export async function requireStaff(
  request: Request,
  env: Env,
  admin = false,
): Promise<Staff> {
  const raw = cookie(request, STAFF_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(raw))
    throw new ApiError(
      401,
      "Silakan masuk sebagai petugas.",
      "unauthenticated",
    );
  const user = await env.DB.prepare(
    `SELECT ${staffFields} FROM staff s JOIN sessions a ON a.staff_id=s.id WHERE a.token_hash=? AND a.kind='staff' AND a.expires_at>? AND s.active=1`,
  )
    .bind(await digest(raw), Date.now())
    .first<Staff>();
  if (!user)
    throw new ApiError(
      401,
      "Sesi berakhir. Silakan masuk kembali.",
      "unauthenticated",
    );
  if (admin && user.role !== "admin")
    throw new ApiError(403, "Hanya pengelola yang dapat melakukan ini.");
  return user;
}
async function signIn(request: Request, env: Env, user: Staff) {
  const raw = token();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash,kind,staff_id,expires_at,created_at) VALUES (?,'staff',?,?,?)",
  )
    .bind(await digest(raw), user.id, now + STAFF_SECONDS * 1000, now)
    .run();
  return ok(user, 200, {
    "Set-Cookie": sessionCookie(request, STAFF_COOKIE, raw, STAFF_SECONDS, env),
  });
}
export async function authConfig(request: Request, env: Env) {
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE expires_at<? LIMIT 100)",
    ).bind(Date.now()),
    env.DB.prepare(
      "DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at<? LIMIT 100)",
    ).bind(Date.now()),
  ]);
  const existing = await env.DB.prepare("SELECT id FROM staff LIMIT 1").first();
  const facility = await env.DB.prepare(
    "SELECT name FROM facility WHERE id=1",
  ).first<{ name: string }>();
  return ok({
    needsSetup: !existing,
    canSetup: canInitialize(request, env),
    facility: facility?.name || "Fasilitas StuntSpecula",
    aiAvailable: !!env.GEMINI_API_KEY && !!env.GEMINI_MODEL,
  });
}
export async function setup(request: Request, env: Env) {
  await rateLimit(env.DB, `setup:${await requestKey(request)}`, 5, 900);
  const input = await body(
    request,
    z.object({
      name: nameSchema,
      email: emailSchema,
      password: passwordSchema,
      facility: nameSchema,
    }),
  );
  if (!canInitialize(request, env))
    throw new ApiError(
      403,
      "Buat pengelola pertama dari localhost atau akses pemilik hosting.",
      "setup_restricted",
    );
  const id = crypto.randomUUID();
  const now = Date.now();
  const password = await hashPassword(input.password);
  const results = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO staff (id,name,email,password_hash,role,active,created_at) SELECT ?,?,?,?,'admin',1,? WHERE NOT EXISTS (SELECT 1 FROM staff) RETURNING id",
    ).bind(id, input.name, input.email, password, now),
    env.DB.prepare(
      "INSERT INTO facility (id,name) SELECT 1,? WHERE EXISTS (SELECT 1 FROM staff WHERE id=?) ON CONFLICT(id) DO NOTHING",
    ).bind(input.facility, id),
  ]);
  if (!results[0].results.length)
    throw new ApiError(409, "Setup sudah selesai. Silakan masuk.");
  return signIn(request, env, {
    id,
    name: input.name,
    email: input.email,
    role: "admin",
    active: 1,
  });
}
export async function login(request: Request, env: Env) {
  await rateLimit(env.DB, `login-ip:${await requestKey(request)}`, 12, 900);
  const input = await body(
    request,
    z.object({ email: emailSchema, password: passwordSchema }),
  );
  await rateLimit(env.DB, `login-account:${await digest(input.email)}`, 8, 900);
  const user = await env.DB.prepare(
    `SELECT ${staffFields},s.password_hash AS passwordHash FROM staff s WHERE s.email=?`,
  )
    .bind(input.email)
    .first<Staff & { passwordHash: string }>();
  // A valid dummy hash prevents an unknown address from skipping password work.
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash ||
      "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxDwbuCVXBQ0DPGCXRWrTjfRBha",
  );
  if (!user || !valid || !user.active)
    throw new ApiError(401, "Email atau password tidak sesuai.");
  return signIn(request, env, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  });
}
export async function logout(request: Request, env: Env) {
  await env.DB.prepare(
    "DELETE FROM sessions WHERE token_hash=? AND kind='staff'",
  )
    .bind(await digest(cookie(request, STAFF_COOKIE)))
    .run();
  return ok(null, 200, {
    "Set-Cookie": sessionCookie(request, STAFF_COOKIE, "", 0, env),
  });
}
export async function listStaff(request: Request, env: Env) {
  await requireStaff(request, env, true);
  return ok(
    (
      await env.DB.prepare(
        `SELECT ${staffFields} FROM staff s ORDER BY s.created_at DESC LIMIT 100`,
      ).all()
    ).results,
  );
}
export async function createStaff(request: Request, env: Env) {
  await requireStaff(request, env, true);
  const input = await body(
    request,
    z.object({
      name: nameSchema,
      email: emailSchema,
      password: passwordSchema,
      role: z.enum(["admin", "staff"]),
    }),
  );
  const exists = await env.DB.prepare("SELECT id FROM staff WHERE email=?")
    .bind(input.email)
    .first();
  if (exists) throw new ApiError(409, "Email sudah terdaftar.");
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      "INSERT INTO staff (id,name,email,password_hash,role,active,created_at) VALUES (?,?,?,?,?,1,?)",
    )
      .bind(
        id,
        input.name,
        input.email,
        await hashPassword(input.password),
        input.role,
        Date.now(),
      )
      .run();
  } catch (error) {
    if (String(error).includes("UNIQUE"))
      throw new ApiError(409, "Email sudah terdaftar.");
    throw error;
  }
  return ok({ id }, 201);
}
export async function setStaffActive(request: Request, env: Env, id: string) {
  const actor = await requireStaff(request, env, true);
  const { active } = await body(request, z.object({ active: z.boolean() }));
  if (id === actor.id)
    throw new ApiError(409, "Akun sendiri tidak dapat dinonaktifkan.");
  const user = await env.DB.prepare(
    "UPDATE staff SET active=? WHERE id=? RETURNING id",
  )
    .bind(Number(active), id)
    .first();
  if (!user) throw new ApiError(404, "Petugas tidak ditemukan.");
  if (!active)
    await env.DB.prepare("DELETE FROM sessions WHERE staff_id=?")
      .bind(id)
      .run();
  return ok(user);
}
