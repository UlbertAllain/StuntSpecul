import assert from "node:assert/strict";
import test from "node:test";
import {
  loginPasswordSchema,
  parentPasswordSchema,
  passwordSchema,
} from "../src/server/security.ts";

test("all newly created accounts require at least 8 password characters", () => {
  for (const schema of [passwordSchema, parentPasswordSchema]) {
    assert.equal(schema.safeParse("12345678").success, true);
    assert.equal(schema.safeParse("1234567").success, false);
  }

  assert.equal(loginPasswordSchema.safeParse("x").success, true);
});
