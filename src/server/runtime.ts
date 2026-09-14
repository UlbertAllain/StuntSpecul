import { createClient } from "@libsql/client";
import { createDatabase } from "./database";
import { applicationConfig, databaseConfig } from "./runtime-config";
import type { Env } from "./env";

let database: Env["DB"] | undefined;

export function runtimeEnvironment(request: Request): Env {
  const config = applicationConfig(process.env, request);
  database ??= createDatabase(createClient(databaseConfig(process.env)));
  return { ...config, DB: database };
}
