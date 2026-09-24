import { ApiError } from "./http";

type Variables = Record<string, string | undefined>;
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function applicationConfig(values: Variables, request: Request) {
  const requestUrl = new URL(request.url);
  const requestIsLocal = LOOPBACK.has(requestUrl.hostname);
  const isProduction = values.NODE_ENV === "production";
  const configured = values.APP_ORIGIN?.trim();

  let origin = requestUrl.origin;

  if (configured) {
    let parsed: URL;
    try {
      parsed = new URL(configured);
    } catch {
      throw new ApiError(
        503,
        "Alamat aplikasi belum valid.",
        "app_origin_invalid",
      );
    }

    const originIsLocal = LOOPBACK.has(parsed.hostname);
    if (
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/" ||
      (parsed.protocol !== "https:" &&
        !(!isProduction && originIsLocal && parsed.protocol === "http:"))
    ) {
      throw new ApiError(
        503,
        "Alamat aplikasi belum valid.",
        "app_origin_invalid",
      );
    }

    origin = parsed.origin;
  } else if (isProduction && requestUrl.protocol !== "https:") {
    throw new ApiError(
      503,
      "Aplikasi production harus menggunakan HTTPS.",
      "app_origin_invalid",
    );
  }

  if (!isProduction && requestIsLocal) {
    origin = requestUrl.origin;
  }

  return {
    APP_ORIGIN: origin,
    ALLOW_LOCAL_SETUP: !isProduction && requestIsLocal,
    GEMINI_API_KEY: values.GEMINI_API_KEY?.trim(),
    GEMINI_MODEL: values.GEMINI_MODEL?.trim(),
    CLOUDINARY_CLOUD_NAME: values.CLOUDINARY_CLOUD_NAME?.trim(),
    CLOUDINARY_API_KEY: values.CLOUDINARY_API_KEY?.trim(),
    CLOUDINARY_API_SECRET: values.CLOUDINARY_API_SECRET?.trim(),
    GOOGLE_CLIENT_ID: values.GOOGLE_CLIENT_ID?.trim(),
    GOOGLE_CLIENT_SECRET: values.GOOGLE_CLIENT_SECRET?.trim(),
    IOT_API_KEY: values.IOT_API_KEY?.trim(),
  };
}
