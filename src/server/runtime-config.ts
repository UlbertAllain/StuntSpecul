import type { Config } from "@libsql/client";
import { ApiError } from "./http";

type Variables = Record<string, string | undefined>;
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function databaseConfig(values: Variables): Config {
  const url = values.DATABASE_URL?.trim();
  const authToken = values.DATABASE_AUTH_TOKEN?.trim();
  if (!url)
    throw new ApiError(503, "Database belum dikonfigurasi oleh pengelola.", "database_not_configured");
  const local = url.startsWith("file:");
  if (local && (values.VERCEL || values.NODE_ENV === "production"))
    throw new ApiError(503, "Hosting membutuhkan database permanen.", "database_url_invalid");
  if (!local) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ApiError(503, "Alamat database belum valid.", "database_url_invalid");
    }
    if (!["libsql:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash)
      throw new ApiError(503, "Alamat database belum valid.", "database_url_invalid");
    if (!authToken)
      throw new ApiError(503, "Akses database belum dikonfigurasi oleh pengelola.", "database_not_configured");
  }
  return { url, authToken, intMode: "number" };
}

export function applicationConfig(values: Variables, request: Request) {
  const development = values.NODE_ENV === "development" && !values.VERCEL;
  const configured = values.APP_ORIGIN?.trim();
  const candidate = configured || (development ? new URL(request.url).origin : "");
  let origin: URL;
  try {
    origin = new URL(candidate);
  } catch {
    throw new ApiError(503, "Alamat aplikasi belum dikonfigurasi oleh pengelola.", "app_origin_invalid");
  }
  const local = LOOPBACK.has(origin.hostname);
  if (
    origin.username || origin.password || origin.search || origin.hash ||
    origin.pathname !== "/" ||
    (origin.protocol !== "https:" && !(development && local && origin.protocol === "http:"))
  )
    throw new ApiError(503, "Alamat aplikasi belum valid.", "app_origin_invalid");
  return {
    APP_ORIGIN: origin.origin,
    ALLOW_LOCAL_SETUP: development && local && LOOPBACK.has(new URL(request.url).hostname),
    GEMINI_API_KEY: values.GEMINI_API_KEY?.trim(),
    GEMINI_MODEL: values.GEMINI_MODEL?.trim(),
  };
}
