import type { D1Database } from "@cloudflare/workers-types";
export type { D1Database } from "@cloudflare/workers-types";
export interface Env {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
  APP_ORIGIN?: string;
  SETUP_OWNER_ID?: string;
  SETUP_OWNER_EMAIL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}
