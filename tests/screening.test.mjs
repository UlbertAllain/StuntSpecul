import assert from "node:assert/strict";
import test from "node:test";
import { assessHeightForAge } from "../src/lib/growth.ts";
import {
  childSchema,
  createScreeningReport,
  formatAge,
  formatReading,
  readMeasurements,
} from "../src/lib/screening.ts";
import { reportText } from "../src/lib/report.ts";

const child = { ageMonths: 36, sex: "male", canStand: true };
const missingCapture = { status: "skipped" };
const completedAt = "2026-09-08T08:00:00.000Z";

test("standing screening accepts only children aged 24-59 months who can stand independently", () => {
  for (const ageMonths of [24, 36, 59]) {
    assert.equal(childSchema.safeParse({ ...child, ageMonths }).success, true);
  }
  for (const invalid of [
    { ...child, ageMonths: 0 },
    { ...child, ageMonths: 23 },
    { ...child, ageMonths: 60 },
    { ...child, ageMonths: -1 },
    { ...child, ageMonths: 36.5 },
    { ...child, ageMonths: NaN },
    { ...child, canStand: false },
    { ...child, sex: "unknown" },
  ])
    assert.equal(childSchema.safeParse(invalid).success, false);
});

test("month display does not round a child up to the next year", () => {
  assert.equal(formatAge(0), "0 bulan");
  assert.equal(formatAge(23), "1 tahun 11 bulan");
  assert.equal(formatAge(36), "3 tahun");
  assert.equal(formatReading(null), "—");
});

test("WHO height-for-age engine classifies monthly standing height deterministically", () => {
  const medianBoy = assessHeightForAge(36, "male", 96.0835);
  assert.equal(medianBoy.heightForAgeZ, 0);
  assert.equal(medianBoy.growthStatus, "within_range");
  assert.equal(medianBoy.stuntingScreening, "not_indicated");

  const monitorBoy = assessHeightForAge(36, "male", 90);
  assert.equal(monitorBoy.growthStatus, "monitor");
  assert.equal(monitorBoy.stuntingScreening, "monitor");
  assert.ok(monitorBoy.heightForAgeZ < -1 && monitorBoy.heightForAgeZ >= -2);

  const stuntedGirl = assessHeightForAge(36, "female", 86);
  assert.equal(stuntedGirl.growthStatus, "stunted");
  assert.equal(stuntedGirl.stuntingScreening, "indicated");
  assert.ok(stuntedGirl.heightForAgeZ < -2 && stuntedGirl.heightForAgeZ >= -3);

  const severeGirl = assessHeightForAge(36, "female", 82);
  assert.equal(severeGirl.growthStatus, "severely_stunted");
  assert.equal(severeGirl.stuntingScreening, "severe");
  assert.ok(severeGirl.heightForAgeZ < -3);
});

test("WHO engine rejects unavailable, out-of-scope and biologically implausible measurements", () => {
  assert.equal(
    assessHeightForAge(36, "male", null).growthStatus,
    "unavailable",
  );
  assert.equal(assessHeightForAge(23, "male", 90).growthStatus, "unavailable");
  assert.equal(
    assessHeightForAge(60, "female", 110).growthStatus,
    "unavailable",
  );
  assert.equal(assessHeightForAge(36, "male", 200).growthStatus, "unavailable");
});

test("disconnected sensors remain missing values throughout the report", () => {
  const readings = readMeasurements();
  const report = createScreeningReport(
    child,
    readings,
    missingCapture,
    completedAt,
  );
  assert.deepEqual(report.readings, { heightCm: null, weightKg: null });
  assert.equal(report.bmi, null);
  assert.equal(report.heightForAgeZ, null);
  assert.equal(report.growthStatus, "unavailable");
  assert.equal(report.stuntingScreening, null);
  assert.equal(report.facialStatus, "unavailable");
  assert.match(reportText(report), /TB\/U Z-score WHO: —/);
  assert.match(reportText(report), /Tinggi badan: — cm/);
});

test("BMI and WHO screening are calculated only from the measurements they require", () => {
  const report = createScreeningReport(
    child,
    { heightCm: 96.0835, weightKg: 15 },
    missingCapture,
    completedAt,
  );
  assert.equal(report.bmi, 16.2);
  assert.equal(report.heightForAgeZ, 0);
  assert.equal(report.growthStatus, "within_range");

  const partial = createScreeningReport(
    child,
    { heightCm: 96.0835, weightKg: null },
    missingCapture,
    completedAt,
  );
  assert.equal(partial.bmi, null);
  assert.equal(partial.heightForAgeZ, 0);
  assert.equal(partial.growthStatus, "within_range");
});

test("raw camera photos are not retained in reports or exported text", () => {
  const capture = {
    status: "captured",
    photo: new Blob(["private-photo"], { type: "image/jpeg" }),
  };
  const report = createScreeningReport(
    child,
    readMeasurements(),
    capture,
    completedAt,
  );
  assert.equal(report.captureStatus, "captured");
  assert.equal(report.facialStatus, "unavailable");
  assert.equal(Object.hasOwn(report, "photo"), false);
  assert.doesNotMatch(reportText(report), /private-photo/);
});

test("invalid readings and timestamps are rejected before report creation", () => {
  for (const readings of [
    { heightCm: 0, weightKg: 15 },
    { heightCm: 100, weightKg: -1 },
    { heightCm: NaN, weightKg: 15 },
    { heightCm: 100, weightKg: Infinity },
  ])
    assert.throws(() =>
      createScreeningReport(child, readings, missingCapture, completedAt),
    );
  assert.throws(() =>
    createScreeningReport(
      child,
      readMeasurements(),
      missingCapture,
      "invalid-date",
    ),
  );
});
