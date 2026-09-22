import { z } from "zod";
import type { Env } from "./env";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "request_failed") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function ok(data: unknown = null, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}
export async function body<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError(415, "Gunakan format JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Data belum diisi.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 16_384) {
      await reader.cancel();
      throw new ApiError(413, "Data terlalu besar.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "Format data tidak valid.");
  }
  const result = schema.safeParse(parsed);
  if (!result.success)
    throw new ApiError(
      422,
      result.error.issues[0]?.message || "Periksa data yang diisi.",
      "validation_failed",
    );
  return result.data;
}
export function sameOrigin(request: Request, env: Env) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin || origin !== (env.APP_ORIGIN || new URL(request.url).origin))
    throw new ApiError(403, "Permintaan tidak diizinkan.", "origin_rejected");
}
export function cookie(request: Request, name: string) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${name}=`))
      ?.slice(name.length + 1) || ""
  );
}
export function sessionCookie(
  request: Request,
  name: string,
  token: string,
  seconds: number,
  env: Env,
) {
  const secure = (env.APP_ORIGIN || request.url).startsWith("https://")
    ? "; Secure"
    : "";
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secure}`;
}
export function failure(error: unknown) {
  const known = error instanceof ApiError;
  if (!known) {
    console.error("API request failed:", error);
  }
  return new Response(
    JSON.stringify({
      success: false,
      message: known
        ? error.message
        : "Layanan sedang tidak tersedia. Silakan coba lagi.",
      code: known ? error.code : "service_unavailable",
    }),
    {
      status: known ? error.status : 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
