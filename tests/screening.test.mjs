import assert from "node:assert/strict";
import test from "node:test";
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

test("child validation accepts whole months and requires independent standing", () => {
  for (const ageMonths of [0, 23, 24, 59]) {
    assert.equal(childSchema.safeParse({ ...child, ageMonths }).success, true);
  }
  for (const invalid of [
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
  assert.equal(report.growthStatus, "unavailable");
  assert.equal(report.stuntingRisk, null);
  assert.equal(report.facialStatus, "unavailable");
  assert.match(reportText(report), /Pemeriksaan belum lengkap/);
  assert.match(reportText(report), /Tinggi badan: — cm/);
});

test("BMI is calculated only from complete readings and never implies a clinical category", () => {
  const report = createScreeningReport(
    child,
    { heightCm: 100, weightKg: 15 },
    missingCapture,
    completedAt,
  );
  assert.equal(report.bmi, 15);
  assert.equal(report.growthStatus, "unavailable");
  const partial = createScreeningReport(
    child,
    { heightCm: 100, weightKg: null },
    missingCapture,
    completedAt,
  );
  assert.equal(partial.bmi, null);
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
