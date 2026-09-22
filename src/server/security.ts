import { compare, hash } from "bcryptjs";
import { z } from "zod";

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
export async function requestKey(request: Request) {
  // Vercel overwrites this header; never trust a client-supplied Cloudflare identity.
  const address =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : undefined;
  return digest(address || "local");
}
