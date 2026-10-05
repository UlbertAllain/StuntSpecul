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
    assert.ok(result.localizedNutrition.foodGroups.length > 0);
    assert.ok(result.localizedNutrition.sampleDay.length >= 3);
    assert.ok(result.localizedNutrition.sources.length >= 2);
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

test("recommendations become contextual when previous TB/U exists", () => {
  const declining = growthRecommendationsFor("stunted", {
    currentHeightForAgeZ: -2.8,
    previousHeightForAgeZ: -2.3,
  });
  const improving = growthRecommendationsFor("stunted", {
    currentHeightForAgeZ: -2.2,
    previousHeightForAgeZ: -2.8,
  });

  assert.equal(declining.trend, "declining");
  assert.equal(declining.trendDelta, -0.5);
  assert.ok(declining.nextSteps[0].includes("turun"));

  assert.equal(improving.trend, "improving");
  assert.equal(improving.trendDelta, 0.6);
  assert.ok(improving.nextSteps[0].includes("naik"));

  assert.notDeepEqual(declining.nextSteps, improving.nextSteps);
  assert.notDeepEqual(declining.nutrition, improving.nutrition);
});

test("localized nutrition plan adapts age band and keeps Indonesian food options", () => {
  const result = growthRecommendationsFor("within_range", {
    ageMonths: 48,
    currentHeightForAgeZ: -0.8,
  });

  assert.equal(result.localizedNutrition.ageBand, "36-59 bulan");
  assert.ok(
    result.localizedNutrition.foodGroups.some(
      (group) =>
        group.label === "Protein hewani" &&
        group.examples.includes("ikan lele"),
    ),
  );
  assert.ok(
    result.localizedNutrition.sampleDay.some((meal) =>
      meal.menu.includes("tempe"),
    ),
  );
});


test("localized nutrition adapts recommendations for infant age bands", () => {
  const infant = growthRecommendationsFor("within_range", {
    ageMonths: 4,
    currentHeightForAgeZ: 0,
  });
  assert.equal(infant.localizedNutrition.ageBand, "0-5 bulan");
  assert.equal(infant.localizedNutrition.sampleDay.length, 0);
  assert.match(infant.nutrition.join(" "), /ASI/);
  assert.equal(infant.risk.indicator, "PB/U");

  const mpasi = growthRecommendationsFor("within_range", {
    ageMonths: 14,
    currentHeightForAgeZ: -0.5,
  });
  assert.equal(mpasi.localizedNutrition.ageBand, "12-23 bulan");
  assert.ok(mpasi.localizedNutrition.sampleDay.length > 0);
  assert.ok(
    mpasi.localizedNutrition.sources.some((source) =>
      source.label.includes("MP-ASI"),
    ),
  );
  assert.equal(mpasi.risk.indicator, "PB/U");
});
