import assert from "node:assert/strict";
import test from "node:test";
import { stuntingRiskFor } from "../src/lib/stunting-risk.ts";

const DAY = 24 * 60 * 60 * 1000;
const now = 200 * DAY;

test("risk engine reports current WHO stunting instead of forecasting it", () => {
  const result = stuntingRiskFor({
    growthStatus: "stunted",
    currentHeightForAgeZ: -2.3,
    currentAt: now,
    history: [],
  });

  assert.equal(result.level, "current_stunting");
  assert.equal(result.projectedHeightForAgeZ, null);
});

test("risk engine waits for at least two longitudinal measurements", () => {
  const result = stuntingRiskFor({
    growthStatus: "within_range",
    currentHeightForAgeZ: -1.2,
    currentAt: now,
    history: [{ at: now, heightForAgeZ: -1.2 }],
  });

  assert.equal(result.level, "insufficient_data");
});

test("risk engine flags a 90-day projection that crosses -2 SD", () => {
  const result = stuntingRiskFor({
    growthStatus: "within_range",
    currentHeightForAgeZ: -1.9,
    currentAt: now,
    history: [
      { at: now - 60 * DAY, heightForAgeZ: -1.4 },
      { at: now, heightForAgeZ: -1.9 },
    ],
  });

  assert.equal(result.level, "high");
  assert.ok(result.projectedHeightForAgeZ < -2);
  assert.ok(result.zChangePer30Days < 0);
});

test("risk engine distinguishes declining trend that has not crossed the forecast threshold", () => {
  const result = stuntingRiskFor({
    growthStatus: "within_range",
    currentHeightForAgeZ: -1.3,
    currentAt: now,
    history: [
      { at: now - 60 * DAY, heightForAgeZ: -1.0 },
      { at: now, heightForAgeZ: -1.3 },
    ],
  });

  assert.equal(result.level, "watch");
  assert.ok(result.projectedHeightForAgeZ >= -2);
});

test("risk engine keeps stable or improving longitudinal data low risk", () => {
  const result = stuntingRiskFor({
    growthStatus: "within_range",
    currentHeightForAgeZ: -0.95,
    currentAt: now,
    history: [
      { at: now - 60 * DAY, heightForAgeZ: -1.0 },
      { at: now, heightForAgeZ: -0.95 },
    ],
  });

  assert.equal(result.level, "low");
  assert.ok(result.projectedHeightForAgeZ > -2);
});

test("risk copy uses PB/U for infant longitudinal screening", () => {
  const result = stuntingRiskFor({
    growthStatus: "within_range",
    currentHeightForAgeZ: -1.2,
    indicator: "PB/U",
    currentAt: now,
    history: [{ at: now - 60 * DAY, heightForAgeZ: -1.0 }],
  });

  assert.equal(result.indicator, "PB/U");
  assert.match(result.reasons.join(" "), /PB\/U/);
  assert.match(result.disclaimer, /PB\/U/);
});
