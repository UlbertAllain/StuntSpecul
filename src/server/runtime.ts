import type { Env } from "./env";
import {
  createFirestoreRest,
  firestoreConfig,
  type FirestoreRest,
} from "./firestore";
import { ApiError } from "./http";
import { applicationConfig } from "./runtime-config";

let firestore: FirestoreRest | undefined;

export function runtimeEnvironment(request: Request): Env {
  const config = applicationConfig(process.env, request);
  const firebase = firestoreConfig(process.env);

  if (!firebase) {
    throw new ApiError(
      503,
      "Firebase belum dikonfigurasi.",
      "firebase_not_configured",
    );
  }

  firestore ??= createFirestoreRest(firebase);

  return {
    ...config,
    FIRESTORE: firestore,
  };
}
