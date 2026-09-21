import type { Env } from "./env";
import { ok } from "./http";

const REQUIRED_MIGRATION = "0005_model_a_face_screening.sql";

export async function health(env: Env): Promise<Response> {
  try {
    const migration = await env.DB.prepare(
      "SELECT name FROM app_migrations WHERE name=? LIMIT 1",
    )
      .bind(REQUIRED_MIGRATION)
      .first<{ name: string }>();

    // Query the columns directly so a stale production schema cannot report
    // healthy merely because the migration table was edited manually.
    await env.DB.prepare(
      "SELECT facial_status,facial_probability,facial_reason,facial_model_version FROM examinations LIMIT 1",
    ).all();

    const databaseReady = migration?.name === REQUIRED_MIGRATION;

    return ok(
      {
        service: "stuntspecula",
        ready: databaseReady,
        databaseReady,
        modelASchemaReady: true,
        requiredMigration: REQUIRED_MIGRATION,
      },
      databaseReady ? 200 : 503,
    );
  } catch {
    return ok(
      {
        service: "stuntspecula",
        ready: false,
        databaseReady: false,
        modelASchemaReady: false,
        requiredMigration: REQUIRED_MIGRATION,
      },
      503,
    );
  }
}
