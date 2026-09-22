import type { Database } from "./database";
import type { FirestoreRest } from "./firestore";

export interface Env {
  DB: Database;
  FIRESTORE?: FirestoreRest;
  APP_ORIGIN: string;
  ALLOW_LOCAL_SETUP?: boolean;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
}
