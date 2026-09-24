import assert from "node:assert/strict";
import test from "node:test";
import {
  loginPasswordSchema,
  parentPasswordSchema,
  passwordSchema,
} from "../src/server/security.ts";

test("parent registration allows 8-character passwords without weakening staff setup", () => {
  assert.equal(parentPasswordSchema.safeParse("12345678").success, true);
  assert.equal(parentPasswordSchema.safeParse("1234567").success, false);

  assert.equal(passwordSchema.safeParse("123456789012").success, true);
  assert.equal(passwordSchema.safeParse("12345678").success, false);

  assert.equal(loginPasswordSchema.safeParse("x").success, true);
});
