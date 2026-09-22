import type { Env } from "./env";
import { sameOrigin } from "./http";
import { routeFirestore } from "./firestore-app";

export async function route(request: Request, env: Env): Promise<Response> {
  sameOrigin(request, env);
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  return routeFirestore(request, env, path, request.method);
}
