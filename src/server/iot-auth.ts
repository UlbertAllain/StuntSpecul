import { createHash, timingSafeEqual } from "node:crypto";
import type { Env } from "./env";
import { ApiError } from "./http.ts";

function hashSecret(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function requireIotApiKey(request: Request, env: Env) {
  const expected = env.IOT_API_KEY?.trim();
  if (!expected) {
    throw new ApiError(
      503,
      "Integrasi IoT belum dikonfigurasi.",
      "iot_not_configured",
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const provided = match?.[1]?.trim();

  if (
    !provided ||
    !timingSafeEqual(hashSecret(provided), hashSecret(expected))
  ) {
    throw new ApiError(
      401,
      "Perangkat IoT tidak dikenali.",
      "iot_unauthorized",
    );
  }
}
