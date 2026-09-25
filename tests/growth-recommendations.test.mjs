import assert from "node:assert/strict";
import test from "node:test";
import {
  GROWTH_RECOMMENDATION_VERSION,
  growthRecommendationsFor,
} from "../src/lib/growth-recommendations.ts";

test("growth recommendations include nutrition and next steps for WHO statuses", () => {
  for (const status of [
    "within_range",
    "monitor",
    "stunted",
    "severely_stunted",
    "unavailable",
  ]) {
    const result = growthRecommendationsFor(status);
    assert.equal(result.version, GROWTH_RECOMMENDATION_VERSION);
    assert.equal(result.basedOn, status);
    assert.ok(result.nutrition.length > 0);
    assert.ok(result.nextSteps.length > 0);
  }
});

test("stunting recommendations include professional follow-up", () => {
  const result = growthRecommendationsFor("stunted");
  assert.ok(
    result.nextSteps.some(
      (item) =>
        item.includes("Puskesmas") ||
        item.includes("dokter") ||
        item.includes("tenaga kesehatan"),
    ),
  );
});
