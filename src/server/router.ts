import type { Env } from "./env";
import { routeFirestore } from "./firestore-app";
import { sameOrigin } from "./http";

export async function route(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/$/, "");

  // ESP32 requests are authenticated with a Bearer token instead of browser
  // Origin checks. Every /api/iot/* handler must call requireIotApiKey().
  if (!path.startsWith("/api/iot/")) {
    sameOrigin(request, env);
  }

  return routeFirestore(request, env, path, request.method);
}
