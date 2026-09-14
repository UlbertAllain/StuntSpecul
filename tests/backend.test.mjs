import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let api, security, ai, working;
before(async () => {
  working = await mkdtemp(join(tmpdir(), "stuntspecula-tests-"));
  await build({
    entryPoints: [
      "src/server/router.ts",
      "src/server/security.ts",
      "src/server/access.ts",
      "src/server/gemini.ts",
    ],
    outdir: working,
    bundle: true,
    platform: "node",
    format: "esm",
    outExtension: { ".js": ".mjs" },
    banner: {
      js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
    },
  });
  api = await import(pathToFileURL(join(working, "router.mjs")));
  security = await import(pathToFileURL(join(working, "security.mjs")));
  ai = await import(pathToFileURL(join(working, "gemini.mjs")));
});
after(async () => {
  if (working) await rm(working, { recursive: true, force: true });
});
class LocalD1 {
  constructor(db) {
    this.db = db;
  }
  prepare(sql) {
    const db = this.db;
    function statement(values = []) {
      return {
        bind: (...args) => statement(args),
        first: async () => db.prepare(sql).get(...values) || null,
        all: async () => ({
          results: db.prepare(sql).all(...values),
          success: true,
        }),
        run: async () => ({
          meta: db.prepare(sql).run(...values),
          success: true,
        }),
        execute: () => {
          const query = db.prepare(sql);
          return {
            results: query.columns().length
              ? query.all(...values)
              : (query.run(...values), []),
            success: true,
          };
        },
      };
    }
    return statement();
  }
  async batch(statements) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((s) => s.execute());
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
async function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of (await readdir("drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    db.exec(await readFile(join("drizzle", file), "utf8"));
  const admin = crypto.randomUUID(),
    staff = crypto.randomUUID(),
    child = crypto.randomUUID(),
    device = crypto.randomUUID(),
    exam = crypto.randomUUID(),
    now = Date.now();
  db.prepare(
    "INSERT INTO staff (id,name,email,password_hash,role,active,created_at) VALUES (?,?,?,'unused',?,1,?)",
  ).run(admin, "Pengelola", "owner@example.test", "admin", now);
  db.prepare(
    "INSERT INTO staff (id,name,email,password_hash,role,active,created_at) VALUES (?,?,?,'unused',?,1,?)",
  ).run(staff, "Petugas", "staff@example.test", "staff", now);
  db.prepare(
    "INSERT INTO children (id,code,name,birth_date,sex,guardian,created_at) VALUES (?,'P001','Nama Privat','2023-01-01','male','Ortu Privat',?)",
  ).run(child, now);
  const mirrorToken = security.token();
  db.prepare(
    "INSERT INTO devices (id,name,token_hash,active,created_at) VALUES (?,'Mirror 1',?,1,?)",
  ).run(device, await security.digest(mirrorToken), now);
  db.prepare(
    "INSERT INTO examinations (id,child_id,staff_id,device_id,age_months,sex,status,created_at,completed_at) VALUES (?,?,?,?,36,'male','completed',?,?)",
  ).run(exam, child, staff, device, now, now);
  const adminToken = security.token(),
    staffToken = security.token();
  for (const [raw, id] of [
    [adminToken, admin],
    [staffToken, staff],
  ])
    db.prepare(
      "INSERT INTO sessions (token_hash,kind,staff_id,expires_at,created_at) VALUES (?,'staff',?,?,?)",
    ).run(await security.digest(raw), id, now + 3600000, now);
  const env = { DB: new LocalD1(db), APP_ORIGIN: "https://example.test" };
  return {
    db,
    env,
    admin,
    staff,
    child,
    device,
    exam,
    adminToken,
    staffToken,
    mirrorToken,
  };
}
function request(
  path,
  method = "GET",
  value,
  session = "",
  origin = "https://example.test",
) {
  return new Request(`https://example.test${path}`, {
    method,
    headers: { "Content-Type": "application/json", origin, cookie: session },
    ...(value === undefined ? {} : { body: JSON.stringify(value) }),
  });
}
async function json(response) {
  return (await response.json()).data;
}
async function parent(f) {
  const link = await json(
    await api.route(
      request(
        `/api/examinations/${f.exam}/access`,
        "POST",
        {},
        `ss_staff=${f.staffToken}`,
      ),
      f.env,
    ),
  );
  const response = await api.route(
    request("/api/parent/exchange", "POST", {
      code: new URL(link.url).hash.slice(1),
    }),
    f.env,
  );
  return { cookie: response.headers.get("set-cookie").split(";")[0], link };
}
test("API rejects missing identities, cross-origin writes and staff access to admin actions", async () => {
  const f = await fixture();
  await assert.rejects(
    () => api.route(request("/api/children"), f.env),
    (e) => e.status === 401,
  );
  await assert.rejects(
    () =>
      api.route(
        request(
          "/api/children",
          "POST",
          {},
          `ss_staff=${f.staffToken}`,
          "https://evil.test",
        ),
        f.env,
      ),
    (e) => e.status === 403,
  );
  await assert.rejects(
    () =>
      api.route(
        request("/api/staff", "POST", {}, `ss_staff=${f.staffToken}`),
        f.env,
      ),
    (e) => e.status === 403,
  );
  f.db.close();
});
test("QR is single-use, binds to one examination, and revocation invalidates the parent session", async () => {
  const f = await fixture(),
    p = await parent(f);
  const result = await json(
    await api.route(
      request("/api/parent/result", "GET", undefined, p.cookie),
      f.env,
    ),
  );
  assert.equal(result.result.id, f.exam);
  assert.equal(result.result.heightCm, null);
  assert.equal(result.result.growthStatus, "unavailable");
  assert.equal(result.result.childId, undefined);
  await assert.rejects(
    () =>
      api.route(
        request("/api/parent/exchange", "POST", {
          code: new URL(p.link.url).hash.slice(1),
        }),
        f.env,
      ),
    (e) => e.status === 410,
  );
  await assert.rejects(
    () =>
      api.route(
        request("/api/examinations", "GET", undefined, p.cookie),
        f.env,
      ),
    (e) => e.status === 401,
  );
  await api.route(
    request(
      `/api/examinations/${f.exam}/access`,
      "DELETE",
      {},
      `ss_staff=${f.staffToken}`,
    ),
    f.env,
  );
  await assert.rejects(
    () =>
      api.route(
        request("/api/parent/result", "GET", undefined, p.cookie),
        f.env,
      ),
    (e) => e.status === 401,
  );
  f.db.close();
});
test("expired QR cannot be exchanged and expired parent cookies cannot read results", async () => {
  const f = await fixture();
  const p = await parent(f);
  f.db.prepare("UPDATE sessions SET expires_at=0 WHERE kind='parent'").run();
  await assert.rejects(
    () =>
      api.route(
        request("/api/parent/result", "GET", undefined, p.cookie),
        f.env,
      ),
    (e) => e.status === 401,
  );
  const link = await json(
    await api.route(
      request(
        `/api/examinations/${f.exam}/access`,
        "POST",
        {},
        `ss_staff=${f.staffToken}`,
      ),
      f.env,
    ),
  );
  f.db.prepare("UPDATE result_links SET expires_at=0").run();
  await assert.rejects(
    () =>
      api.route(
        request("/api/parent/exchange", "POST", {
          code: new URL(link.url).hash.slice(1),
        }),
        f.env,
      ),
    (e) => e.status === 410,
  );
  f.db.close();
});
test("completion is idempotent, staff-scoped, and cannot accept a forged growth classification", async () => {
  const f = await fixture();
  f.db
    .prepare(
      "UPDATE examinations SET status='running',completed_at=NULL WHERE id=?",
    )
    .run(f.exam);
  const payload = { heightCm: 102.4, weightKg: 16.2, captureStatus: "skipped" };
  const path = `/api/mirror/examinations/${f.exam}/complete`,
    cookie = `ss_staff=${f.staffToken}`;
  await assert.rejects(
    () =>
      api.route(
        request(path, "POST", { ...payload, growthStatus: "normal" }, cookie),
        f.env,
      ),
    (e) => e.status === 422,
  );
  await api.route(request(path, "POST", payload, cookie), f.env);
  await api.route(
    request(path, "POST", { ...payload, heightCm: 120 }, cookie),
    f.env,
  );
  const row = f.db
    .prepare("SELECT height_cm,growth_status FROM examinations WHERE id=?")
    .get(f.exam);
  assert.equal(row.height_cm, 102.4);
  assert.equal(row.growth_status, "unavailable");
  await assert.rejects(
    () =>
      api.route(
        request(path, "POST", payload, `ss_mirror=${security.token()}`),
        f.env,
      ),
    (e) => e.status === 401,
  );
  f.db.close();
});
test("one active session per mirror and canceled examinations cannot complete", async () => {
  const f = await fixture();
  f.db
    .prepare("UPDATE examinations SET status='running' WHERE id=?")
    .run(f.exam);
  await assert.rejects(
    () =>
      api.route(
        request(
          "/api/examinations",
          "POST",
          { childId: f.child, canStand: true },
          `ss_staff=${f.staffToken}`,
        ),
        f.env,
      ),
    (e) => e.status === 409,
  );
  await api.route(
    request(
      `/api/examinations/${f.exam}`,
      "DELETE",
      {},
      `ss_staff=${f.staffToken}`,
    ),
    f.env,
  );
  await assert.rejects(
    () =>
      api.route(
        request(
          `/api/mirror/examinations/${f.exam}/complete`,
          "POST",
          { heightCm: null, weightKg: null, captureStatus: "failed" },
          `ss_staff=${f.staffToken}`,
        ),
        f.env,
      ),
    (e) => e.status === 409,
  );
  f.db.close();
});
test("disabled staff loses access immediately", async () => {
  const f = await fixture();
  await api.route(
    request(
      `/api/staff/${f.staff}`,
      "PATCH",
      { active: false },
      `ss_staff=${f.adminToken}`,
    ),
    f.env,
  );
  await assert.rejects(
    () =>
      api.route(
        request("/api/children", "GET", undefined, `ss_staff=${f.staffToken}`),
        f.env,
      ),
    (e) => e.status === 401,
  );
  await assert.rejects(
    () =>
      api.route(
        request(
          `/api/staff/${f.admin}`,
          "PATCH",
          { active: false },
          `ss_staff=${f.adminToken}`,
        ),
        f.env,
      ),
    (e) => e.status === 409,
  );
  f.db.close();
});
test("AI context excludes child identity and missing provider returns an explicit unavailable state", async () => {
  const f = await fixture(),
    p = await parent(f);
  const exam = {
    childName: "Privat",
    childId: f.child,
    childCode: "Secret",
    ageMonths: 36,
    sex: "male",
    heightCm: null,
    weightKg: null,
    bmi: null,
    growthStatus: "unavailable",
    captureStatus: "skipped",
    completedAt: Date.now(),
  };
  const context = JSON.stringify(ai.resultContext(exam));
  assert.ok(!context.includes("Privat"));
  assert.ok(!context.includes(f.child));
  assert.ok(!context.includes("Secret"));
  await assert.rejects(
    () =>
      api.route(
        request(
          "/api/parent/chat",
          "POST",
          { message: "Apa arti hasilnya?", consent: true },
          p.cookie,
        ),
        f.env,
      ),
    (e) => e.code === "ai_not_configured",
  );
  assert.equal(
    f.db.prepare("SELECT count(*) AS count FROM chat_messages").get().count,
    0,
  );
  f.db.close();
});
test("Gemini adapter sends only server result context, uses header auth, and excludes thought content", async () => {
  let sent;
  const explainer = ai.geminiExplainer(
    { GEMINI_API_KEY: "test-only-key", GEMINI_MODEL: "test-model" },
    async (url, options) => {
      sent = { url, options };
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                { text: "internal", thought: true },
                { text: "Data belum tersedia." },
              ],
            },
            finishReason: "STOP",
          },
        ],
      });
    },
  );
  const answer = await explainer.explain(
    {
      childName: "Privat",
      ageMonths: 36,
      sex: "male",
      heightCm: null,
      weightKg: null,
      growthStatus: "unavailable",
    },
    [],
    "Apa hasilnya?",
  );
  assert.equal(answer, "Data belum tersedia.");
  assert.equal(sent.options.headers["x-goog-api-key"], "test-only-key");
  assert.ok(!sent.url.includes("test-only-key"));
  assert.ok(!sent.options.body.includes("Privat"));
});
test("rate limits are enforced atomically", async () => {
  const f = await fixture();
  await security.rateLimit(f.env.DB, "check", 2, 60);
  await security.rateLimit(f.env.DB, "check", 2, 60);
  await assert.rejects(
    () => security.rateLimit(f.env.DB, "check", 2, 60),
    (e) => e.status === 429,
  );
  f.db.close();
});

test("first-admin setup is local or owner-only without a key, is one-time, and login/logout uses real password sessions", async () => {
  const f = await fixture();
  f.db.exec(
    "DELETE FROM sessions; DELETE FROM examinations; DELETE FROM devices; DELETE FROM children; DELETE FROM staff;",
  );
  const profile = {
    name: "Pengelola",
    email: "OWNER@example.test",
    password: "password-for-test-123",
    facility: "Posyandu Melati",
  };
  await assert.rejects(
    () => api.route(request("/api/auth/setup", "POST", profile), f.env),
    (e) => e.status === 403,
  );
  f.env.APP_ORIGIN = "http://localhost:3000";
  const setupRequest = () =>
    new Request("http://localhost:8787/api/auth/setup", {
      method: "POST",
      headers: { "content-type": "application/json", origin: f.env.APP_ORIGIN },
      body: JSON.stringify(profile),
    });
  const response = await api.route(setupRequest(), f.env);
  assert.equal((await json(response)).role, "admin");
  assert.match(response.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.ok(!response.headers.get("set-cookie").includes("; Secure"));
  const stored = f.db.prepare("SELECT email,password_hash FROM staff").get();
  assert.equal(stored.email, "owner@example.test");
  assert.notEqual(stored.password_hash, profile.password);
  await assert.rejects(
    () => api.route(setupRequest(), f.env),
    (e) => e.status === 409,
  );
  f.env.APP_ORIGIN = "https://example.test";
  await assert.rejects(
    () =>
      api.route(
        request("/api/auth/login", "POST", {
          email: profile.email,
          password: "incorrect-password",
        }),
        f.env,
      ),
    (e) => e.status === 401,
  );
  const signedIn = await api.route(
    request("/api/auth/login", "POST", {
      email: profile.email,
      password: profile.password,
    }),
    f.env,
  );
  const cookie = signedIn.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (
      await json(
        await api.route(
          request("/api/auth/me", "GET", undefined, cookie),
          f.env,
        ),
      )
    ).email,
    "owner@example.test",
  );
  await api.route(request("/api/auth/logout", "POST", {}, cookie), f.env);
  await assert.rejects(
    () => api.route(request("/api/auth/me", "GET", undefined, cookie), f.env),
    (e) => e.status === 401,
  );
  f.db.close();
});

test("single station starts without device input, enforces staff ownership and rejects legacy pairing", async () => {
  const f = await fixture();
  const started = await json(
    await api.route(
      request(
        "/api/examinations",
        "POST",
        { childId: f.child, canStand: true, cameraEnabled: false },
        `ss_staff=${f.staffToken}`,
      ),
      f.env,
    ),
  );
  const assigned = await json(
    await api.route(
      request(
        "/api/mirror/assignment",
        "GET",
        undefined,
        `ss_staff=${f.staffToken}`,
      ),
      f.env,
    ),
  );
  assert.equal(assigned.assignment.id, started.id);
  assert.equal(assigned.assignment.cameraEnabled, 0);
  await assert.rejects(
    () =>
      api.route(
        request(
          `/api/mirror/examinations/${started.id}/claim`,
          "POST",
          {},
          `ss_staff=${f.adminToken}`,
        ),
        f.env,
      ),
    (e) => e.status === 409,
  );
  await api.route(
    request(
      `/api/mirror/examinations/${started.id}/claim`,
      "POST",
      {},
      `ss_staff=${f.staffToken}`,
    ),
    f.env,
  );
  await assert.rejects(
    () =>
      api.route(
        request(
          `/api/mirror/examinations/${started.id}/complete`,
          "POST",
          { heightCm: null, weightKg: null, captureStatus: "skipped" },
          `ss_staff=${f.adminToken}`,
        ),
        f.env,
      ),
    (e) => e.status === 404,
  );
  await assert.rejects(
    () =>
      api.route(
        request(
          "/api/examinations",
          "POST",
          { childId: f.child, canStand: true },
          `ss_staff=${f.adminToken}`,
        ),
        f.env,
      ),
    (e) => e.status === 409,
  );
  await assert.rejects(
    () =>
      api.route(
        request(
          "/api/mirror/assignment",
          "GET",
          undefined,
          `ss_mirror=${f.mirrorToken}`,
        ),
        f.env,
      ),
    (e) => e.status === 401,
  );
  await assert.rejects(
    () =>
      api.route(
        request("/api/mirror/pair", "POST", { code: security.token() }),
        f.env,
      ),
    (e) => e.status === 404,
  );
  f.db.close();
});

test("parent chat persists only the authorized conversation and rejects missing consent", async () => {
  const f = await fixture(),
    p = await parent(f);
  f.env.GEMINI_API_KEY = "test-only-key";
  f.env.GEMINI_MODEL = "test-model";
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls += 1;
    assert.ok(!options.body.includes("Nama Privat"));
    return Response.json({
      candidates: [
        {
          content: {
            parts: [
              { text: "Pengukuran belum lengkap. Tanyakan kepada petugas." },
            ],
          },
          finishReason: "STOP",
        },
      ],
    });
  };
  try {
    await assert.rejects(
      () =>
        api.route(
          request(
            "/api/parent/chat",
            "POST",
            { message: "Bagaimana hasilnya?", consent: false },
            p.cookie,
          ),
          f.env,
        ),
      (e) => e.status === 422,
    );
    assert.equal(calls, 0);
    const answer = await json(
      await api.route(
        request(
          "/api/parent/chat",
          "POST",
          { message: "Bagaimana hasilnya?", consent: true },
          p.cookie,
        ),
        f.env,
      ),
    );
    assert.equal(answer.assistant.role, "assistant");
    const restored = await json(
      await api.route(
        request("/api/parent/result", "GET", undefined, p.cookie),
        f.env,
      ),
    );
    assert.equal(restored.messages.length, 2);
    assert.equal(restored.messages[0].content, "Bagaimana hasilnya?");
    assert.equal(restored.messages[1].content, answer.assistant.content);
    assert.equal(
      f.db.prepare("SELECT chat_count FROM sessions WHERE kind='parent'").get()
        .chat_count,
      1,
    );
    await api.route(request("/api/parent/logout", "POST", {}, p.cookie), f.env);
    assert.equal(
      f.db.prepare("SELECT count(*) AS count FROM chat_messages").get().count,
      0,
    );
  } finally {
    globalThis.fetch = originalFetch;
    f.db.close();
  }
});

test("Gemini errors distinguish provider rejection without echoing secrets", async () => {
  const originalLog = console.error;
  const logs = [];
  console.error = (...args) => logs.push(JSON.stringify(args));
  try {
    for (const [status, message, expected] of [
      [400, "API key not valid: private-test-key", "ai_key_invalid"],
      [403, "permission denied private-test-key", "ai_access_denied"],
      [404, "model not found private-test-key", "ai_model_unavailable"],
      [429, "quota exceeded private-test-key", "ai_quota_exceeded"],
      [400, "invalid argument private-test-key", "ai_request_rejected"],
      [503, "service unavailable private-test-key", "ai_provider_error"],
    ]) {
      const provider = ai.geminiExplainer(
        { GEMINI_API_KEY: "private-test-key", GEMINI_MODEL: "test-model" },
        async () => Response.json({ error: { message } }, { status }),
      );
      await assert.rejects(
        () => provider.explain({}, [], "Hello"),
        (error) =>
          error.code === expected &&
          !error.message.includes("private-test-key"),
      );
    }
    assert.ok(!logs.join("").includes("private-test-key"));
  } finally {
    console.error = originalLog;
  }
});
test("Gemini configuration is normalized and connection failures are classified", async () => {
  const env = {
    GEMINI_API_KEY: " test-key ",
    GEMINI_MODEL: " models/test-model ",
  };
  const provider = ai.geminiExplainer(env, async (url, options) => {
    assert.ok(url.endsWith("/models/test-model:generateContent"));
    assert.equal(options.headers["x-goog-api-key"], "test-key");
    return Response.json({
      candidates: [{ content: { parts: [{ text: "Terhubung" }] } }],
    });
  });
  assert.equal(await provider.explain({}, [], "Hello"), "Terhubung");
  for (const [failure, code] of [
    [new TypeError("fetch failed"), "ai_network_error"],
    [new DOMException("Timed out", "TimeoutError"), "ai_timeout"],
  ]) {
    await assert.rejects(
      () =>
        ai
          .geminiExplainer(env, async () => {
            throw failure;
          })
          .explain({}, [], "Hello"),
      (error) => error.code === code,
    );
  }
});
