import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const origin = "http://localhost:3100";
const environment = {
  ...process.env,
  APP_ORIGIN: "https://example.test",
  FIREBASE_PROJECT_ID: "",
  FIREBASE_CLIENT_EMAIL: "",
  FIREBASE_PRIVATE_KEY: "",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "",
  NODE_ENV: "production",
};

let server;

async function start() {
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3100"],
    { env: environment, stdio: "ignore" },
  );

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error("Next.js exited before startup");
    }

    try {
      const response = await fetch(origin + "/");
      if (response.ok) return;
    } catch {}

    await delay(250);
  }

  throw new Error("Next.js startup timed out");
}

async function stop() {
  if (!server || server.exitCode !== null) return;

  const stopped = new Promise((resolve) => server.once("exit", resolve));
  server.kill("SIGTERM");
  const timer = setTimeout(() => server.kill("SIGKILL"), 5000);

  try {
    await stopped;
  } finally {
    clearTimeout(timer);
  }
}

try {
  await start();

  for (const path of ["/", "/login", "/alat"]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, `${path} should render`);
  }

  const config = await fetch(origin + "/api/config");
  assert.equal(config.status, 503);
  const payload = await config.json();
  assert.equal(payload.code, "firebase_not_configured");

  for (const asset of [
    "mimo-cheer.png",
    "mimo-stand.png",
    "stuntspecula-logo.jpeg",
  ]) {
    const response = await fetch(origin + "/images/" + asset);
    assert.equal(response.status, 200);
  }

  console.log(
    "HTTP smoke passed: public routes/assets render and missing Firebase is reported safely.",
  );
} finally {
  await stop();
}
