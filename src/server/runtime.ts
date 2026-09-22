import { createClient } from "@libsql/client";
import { createDatabase, unavailableDatabase } from "./database";
import { applicationConfig, databaseConfig } from "./runtime-config";
import {
  createFirestoreRest,
  firestoreConfig,
  type FirestoreRest,
} from "./firestore";
import type { Env } from "./env";
import { ApiError } from "./http";

let firestore: FirestoreRest | undefined;
let developmentDatabase: Env["DB"] | undefined;

export function runtimeEnvironment(request: Request): Env {
  const config = applicationConfig(process.env, request);
  const firebase = firestoreConfig(process.env);

  if (firebase) {
    firestore ??= createFirestoreRest(firebase);
    return {
      ...config,
      DB: unavailableDatabase(),
      FIRESTORE: firestore,
    };
  }

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DATABASE_URL?.trim()
  ) {
    developmentDatabase ??= createDatabase(
      createClient(databaseConfig(process.env)),
    );
    return {
      ...config,
      DB: developmentDatabase,
    };
  }

  throw new ApiError(
    503,
    "Firebase belum dikonfigurasi.",
    "firebase_not_configured",
  );
}
