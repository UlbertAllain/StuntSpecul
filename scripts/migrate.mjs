import { createClient } from "@libsql/client";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvironment, withServerModule } from "./server-module.mjs";
import {
  acceptedMigrationChecksums,
  migrationChecksum,
} from "./migration-checksum.mjs";

loadEnvironment();
let client;
try {
  const config = await withServerModule(
    "src/server/runtime-config.ts",
    ({ databaseConfig }) => databaseConfig(process.env),
  );
  client = createClient(config);
  await client.execute(
    "CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at INTEGER NOT NULL)",
  );
  const { rows } = await client.execute(
    "SELECT name,checksum FROM app_migrations",
  );
  const applied = new Map(rows.map((row) => [row.name, row.checksum]));
  const files = (await readdir("drizzle"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const name of files) {
    const sql = await readFile(join("drizzle", name), "utf8");
    const checksum = migrationChecksum(sql);
    if (applied.has(name)) {
      const storedChecksum = String(applied.get(name));
      const acceptedChecksums = acceptedMigrationChecksums(sql);
      if (!acceptedChecksums.has(storedChecksum))
        throw new Error(
          `Migration checksum changed for ${name}; restore the original migration.`,
        );

      if (storedChecksum !== checksum) {
        await client.execute({
          sql: "UPDATE app_migrations SET checksum=? WHERE name=?",
          args: [checksum, name],
        });
        console.log(
          `Checksum migrasi dinormalisasi untuk ${name} (line ending lintas platform).`,
        );
      }
      continue;
    }
    const statements = sql
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);
    await client.batch(
      [
        ...statements,
        {
          sql: "INSERT INTO app_migrations (name,checksum,applied_at) VALUES (?,?,?)",
          args: [name, checksum, Date.now()],
        },
      ],
      "write",
    );
    console.log(`Migrasi diterapkan: ${name}`);
  }
  console.log(
    "Database siap. Migrasi yang sudah tercatat tidak dijalankan ulang.",
  );
} catch (error) {
  if (
    ["database_not_configured", "database_url_invalid"].includes(error.code)
  ) {
    console.error(`${error.code}: ${error.message}`);
  } else {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(
      "Migrasi gagal. Database tidak dihapus atau di-reset. Detail:",
      detail,
    );
  }
  process.exitCode = 1;
} finally {
  client?.close();
}
