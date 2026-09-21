import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { build } from "esbuild";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let api, working;

before(async () => {
  working = await mkdtemp(join(tmpdir(), "stuntspecula-parent-tests-"));
  await build({
    entryPoints: ["src/server/router.ts"],
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
      const results = statements.map((statement) => statement.execute());
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
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    db.exec(await readFile(join("drizzle", file), "utf8"));
  }
  return {
    db,
    env: {
      DB: new LocalD1(db),
      APP_ORIGIN: "https://example.test",
    },
  };
}

function request(path, method = "GET", value, cookie = "") {
  return new Request(`https://example.test${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      origin: "https://example.test",
      cookie,
    },
    ...(value === undefined ? {} : { body: JSON.stringify(value) }),
  });
}

async function data(response) {
  return (await response.json()).data;
}

async function register(env, suffix) {
  const response = await api.route(
    request("/api/parent-account/register", "POST", {
      name: `Orang Tua ${suffix}`,
      email: `parent-${suffix}@example.test`,
      password: `rahasia-aman-${suffix}-123`,
      child: {
        name: `Anak ${suffix}`,
        birthDate: "2023-01-15",
        sex: suffix === "a" ? "female" : "male",
      },
    }),
    env,
  );
  return {
    account: await data(response),
    cookie: response.headers.get("set-cookie").split(";")[0],
  };
}

test("parent registration creates a hashed persistent account linked to one child", async () => {
  const f = await fixture();
  try {
    const parent = await register(f.env, "a");
    assert.equal(parent.account.email, "parent-a@example.test");
    assert.match(parent.cookie, /^ss_parent_account=/);

    const stored = f.db
      .prepare(
        "SELECT p.email,p.password_hash AS passwordHash,pc.child_id AS childId,c.guardian FROM parent_accounts p JOIN parent_children pc ON pc.parent_id=p.id JOIN children c ON c.id=pc.child_id WHERE p.email=?",
      )
      .get("parent-a@example.test");
    assert.equal(stored.email, "parent-a@example.test");
    assert.notEqual(stored.passwordHash, "rahasia-aman-a-123");
    assert.ok(stored.passwordHash.startsWith("$2"));
    assert.equal(stored.guardian, "Orang Tua a");

    const view = await data(
      await api.route(
        request("/api/parent-account/me", "GET", undefined, parent.cookie),
        f.env,
      ),
    );
    assert.equal(view.children.length, 1);
    assert.equal(view.children[0].name, "Anak a");
    assert.deepEqual(view.examinations, []);
  } finally {
    f.db.close();
  }
});

test("parent portal exposes only examinations belonging to linked children", async () => {
  const f = await fixture();
  try {
    const parentA = await register(f.env, "a");
    const parentB = await register(f.env, "b");
    const now = Date.now();
    const staffId = crypto.randomUUID();
    const deviceId = crypto.randomUUID();
    f.db
      .prepare(
        "INSERT INTO staff (id,name,email,password_hash,role,active,created_at) VALUES (?,'Petugas','petugas-parent-test@example.test','unused','staff',1,?)",
      )
      .run(staffId, now);
    f.db
      .prepare(
        "INSERT INTO devices (id,name,active,created_at) VALUES (?,'Mirror',1,?)",
      )
      .run(deviceId, now);

    const childA = f.db
      .prepare(
        "SELECT child_id AS childId FROM parent_children WHERE parent_id=?",
      )
      .get(parentA.account.id).childId;
    const childB = f.db
      .prepare(
        "SELECT child_id AS childId FROM parent_children WHERE parent_id=?",
      )
      .get(parentB.account.id).childId;
    const examA = crypto.randomUUID();
    const examB = crypto.randomUUID();

    for (const [id, childId, sex, height] of [
      [examA, childA, "female", 95],
      [examB, childB, "male", 97],
    ]) {
      f.db
        .prepare(
          "INSERT INTO examinations (id,child_id,staff_id,device_id,age_months,sex,status,height_cm,weight_kg,bmi,capture_status,created_at,completed_at) VALUES (?,?,?,?,36,?,'completed',?,14,15.5,'captured',?,?)",
        )
        .run(id, childId, staffId, deviceId, sex, height, now, now);
    }

    const viewA = await data(
      await api.route(
        request("/api/parent-account/me", "GET", undefined, parentA.cookie),
        f.env,
      ),
    );
    assert.equal(viewA.examinations.length, 1);
    assert.equal(viewA.examinations[0].id, examA);
    assert.notEqual(viewA.examinations[0].id, examB);

    await assert.rejects(
      () =>
        api.route(
          request(
            `/api/parent-account/messages?examId=${examB}`,
            "GET",
            undefined,
            parentA.cookie,
          ),
          f.env,
        ),
      (error) => error.status === 404,
    );
  } finally {
    f.db.close();
  }
});

test("parent logout invalidates the persistent monitoring session", async () => {
  const f = await fixture();
  try {
    const parent = await register(f.env, "logout");
    await api.route(
      request("/api/parent-account/logout", "POST", {}, parent.cookie),
      f.env,
    );
    await assert.rejects(
      () =>
        api.route(
          request("/api/parent-account/me", "GET", undefined, parent.cookie),
          f.env,
        ),
      (error) => error.status === 401,
    );
  } finally {
    f.db.close();
  }
});

test("public portrait station status never exposes child identity or examination id", async () => {
  const f = await fixture();
  try {
    const parent = await register(f.env, "station");
    const childId = f.db
      .prepare(
        "SELECT child_id AS childId FROM parent_children WHERE parent_id=?",
      )
      .get(parent.account.id).childId;
    const now = Date.now();
    const staffId = crypto.randomUUID();
    const deviceId = crypto.randomUUID();
    f.db
      .prepare(
        "INSERT INTO staff (id,name,email,password_hash,role,active,created_at) VALUES (?,'Petugas','station@example.test','unused','staff',1,?)",
      )
      .run(staffId, now);
    f.db
      .prepare(
        "INSERT INTO devices (id,name,active,created_at) VALUES (?,'Mirror',1,?)",
      )
      .run(deviceId, now);
    f.db
      .prepare(
        "INSERT INTO examinations (id,child_id,staff_id,device_id,age_months,sex,status,created_at) VALUES (?,?,?,?,36,'female','queued',?)",
      )
      .run(crypto.randomUUID(), childId, staffId, deviceId, now);

    const station = await data(
      await api.route(request("/api/station/active"), f.env),
    );
    assert.equal(station.active.status, "queued");
    assert.equal(Object.hasOwn(station.active, "id"), false);
    assert.equal(Object.hasOwn(station.active, "ageMonths"), false);
    assert.equal(Object.hasOwn(station.active, "sex"), false);
    assert.equal(Object.hasOwn(station.active, "childName"), false);
  } finally {
    f.db.close();
  }
});


test("parent can start, complete, and finalize the single-station examination lifecycle", async () => {
  const f = await fixture();
  try {
    const parent = await register(f.env, "flow");
    const childId = f.db
      .prepare(
        "SELECT child_id AS childId FROM parent_children WHERE parent_id=?",
      )
      .get(parent.account.id).childId;

    const started = await data(
      await api.route(
        request(
          "/api/parent-account/examinations",
          "POST",
          { childId, cameraEnabled: true, canStand: true },
          parent.cookie,
        ),
        f.env,
      ),
    );
    assert.equal(started.status, "queued");

    const stored = f.db
      .prepare(
        "SELECT status,staff_id AS staffId,device_id AS deviceId FROM examinations WHERE id=?",
      )
      .get(started.id);
    assert.equal(stored.status, "queued");
    assert.equal(stored.staffId, "guest-screening-system");
    assert.equal(stored.deviceId, "single-station");

    const claimed = await data(
      await api.route(
        request("/api/station/claim", "POST", {}),
        f.env,
      ),
    );
    assert.equal(claimed.status, "running");

    await data(
      await api.route(
        request("/api/station/complete", "POST", {
          heightCm: 95,
          weightKg: 14,
          captureStatus: "captured",
          facialStatus: "unavailable",
          facialProbability: null,
          facialReason: null,
          facialModelVersion: null,
        }),
        f.env,
      ),
    );

    const waiting = await data(
      await api.route(request("/api/station/active"), f.env),
    );
    assert.equal(waiting.active.status, "completed");

    const finalized = await data(
      await api.route(
        request(
          `/api/parent-account/examinations/${started.id}/finalize`,
          "POST",
          {},
          parent.cookie,
        ),
        f.env,
      ),
    );
    assert.equal(finalized.finalized, true);

    const idle = await data(
      await api.route(request("/api/station/active"), f.env),
    );
    assert.equal(idle.active, null);
  } finally {
    f.db.close();
  }
});

test("parent can cancel their own stale queued examination", async () => {
  const f = await fixture();
  try {
    const parent = await register(f.env, "cancel-flow");
    const childId = f.db
      .prepare(
        "SELECT child_id AS childId FROM parent_children WHERE parent_id=?",
      )
      .get(parent.account.id).childId;

    const started = await data(
      await api.route(
        request(
          "/api/parent-account/examinations",
          "POST",
          { childId, cameraEnabled: true, canStand: true },
          parent.cookie,
        ),
        f.env,
      ),
    );

    const cancelled = await data(
      await api.route(
        request(
          `/api/parent-account/examinations/${started.id}/cancel`,
          "POST",
          {},
          parent.cookie,
        ),
        f.env,
      ),
    );
    assert.equal(cancelled.cancelled, true);

    const status = f.db
      .prepare("SELECT status FROM examinations WHERE id=?")
      .get(started.id);
    assert.equal(status.status, "cancelled");
  } finally {
    f.db.close();
  }
});
