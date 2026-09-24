import assert from "node:assert/strict";
import test from "node:test";
import { requireIotApiKey } from "../src/server/iot-auth.ts";

const key = "a".repeat(64);
const env = { IOT_API_KEY: key };

test("IoT API accepts only the configured Bearer token", () => {
  assert.doesNotThrow(() =>
    requireIotApiKey(
      new Request("https://example.test/api/iot/session", {
        headers: { Authorization: `Bearer ${key}` },
      }),
      env,
    ),
  );

  assert.throws(
    () =>
      requireIotApiKey(
        new Request("https://example.test/api/iot/session", {
          headers: { Authorization: "Bearer wrong-key" },
        }),
        env,
      ),
    (error) => error.code === "iot_unauthorized" && error.status === 401,
  );

  assert.throws(
    () =>
      requireIotApiKey(
        new Request("https://example.test/api/iot/session"),
        env,
      ),
    (error) => error.code === "iot_unauthorized" && error.status === 401,
  );
});

test("IoT API fails closed when no server key is configured", () => {
  assert.throws(
    () =>
      requireIotApiKey(
        new Request("https://example.test/api/iot/session", {
          headers: { Authorization: `Bearer ${key}` },
        }),
        {},
      ),
    (error) => error.code === "iot_not_configured" && error.status === 503,
  );
});
