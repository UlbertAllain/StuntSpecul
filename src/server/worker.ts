import type { Env } from "./env";
import { failure } from "./http";
import { route } from "./router";

const worker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    let response: Response;
    if (url.pathname.startsWith("/api/")) {
      try {
        response = await route(request, env);
      } catch (error) {
        response = failure(error);
      }
    } else {
      if (!["GET", "HEAD"].includes(request.method))
        return new Response("Method not allowed", { status: 405 });
      response = await env.ASSETS.fetch(request);
    }
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set(
      "Permissions-Policy",
      "camera=(self), microphone=(), geolocation=()",
    );
    if (url.protocol === "https:")
      headers.set("Strict-Transport-Security", "max-age=31536000");
    // Result/session responses must never enter shared or browser caches.
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/hasil"))
      headers.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
export default worker;
