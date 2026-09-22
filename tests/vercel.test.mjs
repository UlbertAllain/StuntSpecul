import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let working;
let config;
let firestore;

before(async () => {
  working = await mkdtemp(join(tmpdir(), "stuntspecula-runtime-"));
  await build({
    entryPoints: ["src/server/runtime-config.ts", "src/server/firestore.ts"],
    outdir: working,
    bundle: true,
    platform: "node",
    format: "esm",
    outExtension: { ".js": ".mjs" },
  });

  config = await import(pathToFileURL(join(working, "runtime-config.mjs")));
  firestore = await import(pathToFileURL(join(working, "firestore.mjs")));
});

after(async () => {
  if (working) await rm(working, { recursive: true, force: true });
});

test("Firestore credentials must be complete and normalize private keys", () => {
  assert.equal(firestore.firestoreConfig({}), null);

  assert.throws(
    () => firestore.firestoreConfig({ FIREBASE_PROJECT_ID: "project" }),
    (error) => error.code === "firebase_not_configured",
  );

  const value = firestore.firestoreConfig({
    FIREBASE_PROJECT_ID: "stuntspecula",
    FIREBASE_CLIENT_EMAIL: "service@example.test",
    FIREBASE_PRIVATE_KEY:
      "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
  });

  assert.equal(value.projectId, "stuntspecula");
  assert.equal(value.clientEmail, "service@example.test");
  assert.match(value.privateKey, /BEGIN PRIVATE KEY-----\nabc\n-----END/);
});

test("production origin is HTTPS and local setup stays development-only", () => {
  assert.equal(
    config.applicationConfig(
      { NODE_ENV: "production" },
      new Request("https://example.test/api/config"),
    ).APP_ORIGIN,
    "https://example.test",
  );

  assert.throws(() =>
    config.applicationConfig(
      {
        NODE_ENV: "production",
        APP_ORIGIN: "http://localhost:3000",
      },
      new Request("https://example.test/api/config"),
    ),
  );

  const local = config.applicationConfig(
    {
      NODE_ENV: "development",
      APP_ORIGIN: "http://localhost:3000/",
    },
    new Request("http://localhost:3000/api/config"),
  );

  assert.equal(local.ALLOW_LOCAL_SETUP, true);
  assert.equal(local.APP_ORIGIN, "http://localhost:3000");
});
