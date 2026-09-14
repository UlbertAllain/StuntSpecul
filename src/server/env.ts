import type { Database } from "./database";
export interface Env {
  DB: Database;
  APP_ORIGIN: string;
  ALLOW_LOCAL_SETUP?: boolean;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}
