import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let working, adapter, config;
before(async () => {
  working = await mkdtemp(join(tmpdir(), "stuntspecula-vercel-"));
  await build({
    entryPoints: ["src/server/database.ts", "src/server/runtime-config.ts"],
    outdir: working,
    bundle: true,
    platform: "node",
    format: "esm",
    outExtension: { ".js": ".mjs" },
  });
  adapter = await import(pathToFileURL(join(working, "database.mjs")));
  config = await import(pathToFileURL(join(working, "runtime-config.mjs")));
});
after(async () => {
  if (working) await rm(working, { recursive: true, force: true });
});

test("production rejects local/missing database and missing application origin", () => {
  for (const values of [
    {},
    { DATABASE_URL: "file:local.db", NODE_ENV: "production" },
    { DATABASE_URL: "file:local.db", VERCEL: "1" },
    { DATABASE_URL: "https://database.example" },
    { DATABASE_URL: "http://database.example", DATABASE_AUTH_TOKEN: "test-only" },
  ])
    assert.throws(() => config.databaseConfig(values), (error) => error.status === 503);
  assert.throws(
    () => config.applicationConfig({ NODE_ENV: "production" }, new Request("https://example.test/api/config")),
    (error) => error.code === "app_origin_invalid",
  );
  assert.equal(config.databaseConfig({ DATABASE_URL: "file:local.db" }).url, "file:local.db");
});

test("production cannot enable setup using local URLs or forged owner headers", () => {
  const request = new Request("http://localhost:3000/api/config", {
    headers: { "oai-authenticated-user-email": "owner@example.test" },
  });
  assert.equal(config.applicationConfig({
    NODE_ENV: "production",
    VERCEL: "1",
    APP_ORIGIN: "https://stuntspecula.vercel.app",
    SETUP_OWNER_EMAIL: "owner@example.test",
  }, request).ALLOW_LOCAL_SETUP, false);
  assert.throws(() => config.applicationConfig({
    NODE_ENV: "production", VERCEL: "1", APP_ORIGIN: "http://localhost:3000",
  }, request));
  assert.equal(config.applicationConfig({
    NODE_ENV: "development", APP_ORIGIN: "http://localhost:3000/",
  }, request).ALLOW_LOCAL_SETUP, true);
});

test("SQL adapter binds values safely, maps rows and keeps statements immutable", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    const db = adapter.createDatabase(client);
    await db.prepare("CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT, reading REAL)").run();
    const malicious = "'; DROP TABLE sample; --";
    const query = db.prepare("INSERT INTO sample VALUES (?,?,?)");
    await query.bind(1, malicious, 16.2).run();
    await query.bind(2, null, null).run();
    assert.deepEqual(await db.prepare("SELECT * FROM sample WHERE id=?").bind(1).first(), {
      id: 1, value: malicious, reading: 16.2,
    });
    assert.equal((await db.prepare("SELECT * FROM sample").all()).results.length, 2);
    assert.equal(await db.prepare("SELECT * FROM sample WHERE id=99").first(), null);
    assert.equal((await db.prepare("SELECT * FROM sample WHERE id=2").first()).value, null);
    assert.deepEqual(await db.batch([]), []);
  } finally { client.close(); }
});

test("write batches return rows and roll back completely on a constraint failure", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    const db = adapter.createDatabase(client);
    await db.prepare("CREATE TABLE sample (id INTEGER PRIMARY KEY)").run();
    const result = await db.batch([db.prepare("INSERT INTO sample VALUES (1) RETURNING id")]);
    assert.deepEqual(result[0].results, [{ id: 1 }]);
    await assert.rejects(() => db.batch([
      db.prepare("INSERT INTO sample VALUES (2)"),
      db.prepare("INSERT INTO sample VALUES (1)"),
    ]));
    assert.equal(await db.prepare("SELECT * FROM sample WHERE id=2").first(), null);
    const other = adapter.createDatabase(client);
    await assert.rejects(() => db.batch([other.prepare("SELECT 1")]));
  } finally { client.close(); }
});

test("existing schema works with libSQL, including foreign keys and chat cascade", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    const sql = await readFile("drizzle/0000_damp_champions.sql", "utf8");
    await client.batch(sql.split("--> statement-breakpoint").map((statement) => statement.trim()).filter(Boolean), "write");
    const db = adapter.createDatabase(client);
    await db.prepare("INSERT INTO staff VALUES ('staff','Name','owner@example.test','hash','admin',1,1)").run();
    await db.prepare("INSERT INTO sessions (token_hash,kind,staff_id,expires_at,created_at) VALUES ('session','staff','staff',2,1)").run();
    await db.prepare("INSERT INTO chat_messages VALUES ('message','session','user','Hello',1)").run();
    await db.prepare("DELETE FROM sessions WHERE token_hash='session'").run();
    assert.equal((await db.prepare("SELECT * FROM chat_messages").all()).results.length, 0);
    await assert.rejects(() => db.prepare("INSERT INTO chat_messages VALUES ('orphan','missing','user','Hello',1)").run());
  } finally { client.close(); }
});
