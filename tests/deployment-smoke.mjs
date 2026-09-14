import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const origin = "http://localhost:3100";
const directory = await mkdtemp(join(tmpdir(), "stuntspecula-http-"));
const databaseUrl = `file:${join(directory, "screening.db")}`;
const environment = {
  ...process.env,
  APP_ORIGIN: origin,
  DATABASE_URL: databaseUrl,
  DATABASE_AUTH_TOKEN: "",
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "",
  VERCEL: "",
  NODE_ENV: "development",
};
let server;
async function start(mode, variables) {
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", mode, "--port", "3100"],
    {
      env: variables,
      stdio: "ignore",
    },
  );
  let startupError;
  server.on("error", (error) => {
    startupError = error;
  });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (startupError) throw startupError;
    if (server.exitCode !== null)
      throw new Error("Next.js exited before startup");
    try {
      await fetch(origin + "/api/config", {
        signal: AbortSignal.timeout(1000),
      });
      return;
    } catch {
      await delay(250);
    }
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
async function request(
  path,
  method = "GET",
  body,
  cookie = "",
  requestOrigin = origin,
) {
  return fetch(origin + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      origin: requestOrigin,
      cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
}
async function data(response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.success, true);
  return payload.data;
}
try {
  // The production build must serve the API itself even when credentials are missing.
  await start("start", {
    ...environment,
    NODE_ENV: "production",
    APP_ORIGIN: "https://example.test",
    DATABASE_URL: "",
  });
  const missing = await request("/config");
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).code, "database_not_configured");
  assert.equal(missing.headers.get("x-content-type-options"), "nosniff");
  assert.match(missing.headers.get("cache-control"), /no-store/);
  for (const asset of [
    "mimo-cheer.png",
    "mimo-stand.png",
    "stuntspecula-logo.jpeg",
  ]) {
    const response = await fetch(origin + "/images/" + asset);
    assert.equal(response.status, 200);
  }
  await stop();

  execFileSync(process.execPath, ["scripts/migrate.mjs"], {
    env: environment,
    stdio: "inherit",
  });
  await start("dev", environment);
  assert.equal((await data(await request("/config"))).canSetup, true);
  const setup = await request("/auth/setup", "POST", {
    facility: "Fasilitas pengujian",
    name: "Pengelola pengujian",
    email: "test@example.test",
    password: "test-only-password-123",
  });
  await data(setup.clone());
  const staffCookie = setup.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await data(await request("/auth/me", "GET", undefined, staffCookie))).role,
    "admin",
  );
  assert.equal((await request("/children")).status, 401);
  assert.equal(
    (await request("/children", "POST", {}, staffCookie, "https://evil.test"))
      .status,
    403,
  );
  const birth = new Date();
  birth.setUTCFullYear(birth.getUTCFullYear() - 3);
  const child = await data(
    await request(
      "/children",
      "POST",
      {
        code: "HTTP001",
        name: "Anak pengujian",
        birthDate: birth.toISOString().slice(0, 10),
        sex: "male",
        guardian: "Orang tua pengujian",
      },
      staffCookie,
    ),
    201,
  );
  const exam = await data(
    await request(
      "/examinations",
      "POST",
      {
        childId: child.id,
        canStand: true,
        cameraEnabled: false,
      },
      staffCookie,
    ),
    201,
  );
  await data(
    await request(
      `/mirror/examinations/${exam.id}/claim`,
      "POST",
      {},
      staffCookie,
    ),
  );
  await data(
    await request(
      `/mirror/examinations/${exam.id}/complete`,
      "POST",
      {
        heightCm: null,
        weightKg: null,
        captureStatus: "skipped",
      },
      staffCookie,
    ),
  );
  await data(await request("/examinations", "GET", undefined, staffCookie));
  const link = await data(
    await request(`/examinations/${exam.id}/access`, "POST", {}, staffCookie),
  );
  const exchanged = await request("/parent/exchange", "POST", {
    code: new URL(link.url).hash.slice(1),
  });
  await data(exchanged.clone());
  const parentCookie = exchanged.headers.get("set-cookie").split(";")[0];
  const result = await data(
    await request("/parent/result", "GET", undefined, parentCookie),
  );
  assert.equal(result.result.id, exam.id);
  assert.equal(result.result.growthStatus, "unavailable");
  const chat = await request(
    "/parent/chat",
    "POST",
    { message: "Apa arti hasilnya?", consent: true },
    parentCookie,
  );
  assert.equal(chat.status, 503);
  assert.equal((await chat.json()).code, "ai_not_configured");
  console.log(
    "HTTP smoke passed: production API/assets, setup, staff, examination, history, parent QR, AI configuration.",
  );
} finally {
  await stop();
  await rm(directory, { recursive: true, force: true });
}
