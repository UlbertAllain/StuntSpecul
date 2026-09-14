import type { D1Database } from "./env";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { ApiError } from "./http";

export const passwordSchema = z
  .string()
  .min(12, "Password minimal 12 karakter.")
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    "Password maksimal 72 byte.",
  );
export const tokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Kode akses tidak valid.");
export const idSchema = z.string().uuid();
export const emailSchema = z
  .string()
  .trim()
  .email("Email tidak valid.")
  .max(160)
  .transform((v) => v.toLowerCase());
export const nameSchema = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter.")
  .max(80);
export const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export const hashPassword = (password: string) => hash(password, 12);
export const verifyPassword = (password: string, encoded: string) =>
  compare(password, encoded);
export async function rateLimit(
  db: D1Database,
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const now = Date.now();
  const bucket = Math.floor(now / (windowSeconds * 1000));
  const row = await db
    .prepare(
      "INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(`${key}:${bucket}`, now + windowSeconds * 1000)
    .first<{ count: number }>();
  if (!row || row.count > limit)
    throw new ApiError(
      429,
      "Terlalu banyak permintaan. Coba lagi nanti.",
      "rate_limited",
    );
}
export async function requestKey(request: Request) {
  return digest(request.headers.get("cf-connecting-ip") || "local");
}
