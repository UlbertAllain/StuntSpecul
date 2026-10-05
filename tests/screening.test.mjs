import assert from "node:assert/strict";
import test from "node:test";
import {
  assessAnthropometry,
  weightForAgeZScore,
} from "../src/lib/anthropometry.ts";
import {
  assessHeightForAge,
  assessLengthForAge,
  growthStatusLabelForAge,
  linearGrowthIndicator,
} from "../src/lib/growth.ts";
import {
  childSchema,
  createScreeningReport,
  formatAge,
  formatReading,
  readMeasurements,
} from "../src/lib/screening.ts";
import { reportText } from "../src/lib/report.ts";
import { formatDetailedAge } from "../src/lib/portal.ts";

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

test("profile age is derived from birth date down to completed days", () => {
  const at = new Date(2026, 9, 5, 12, 0, 0);
  assert.equal(formatDetailedAge("2022-05-14", at), "4 tahun 4 bulan 21 hari");
  assert.equal(formatDetailedAge("2026-10-01", at), "0 bulan 4 hari");
});

test("WHO height-for-age engine classifies monthly standing height deterministically", () => {
  const medianBoy = assessHeightForAge(36, "male", 96.0835);
  assert.equal(medianBoy.heightForAgeZ, 0);
  assert.equal(medianBoy.growthStatus, "within_range");
  assert.equal(medianBoy.stuntingScreening, "not_indicated");

  const shortButNotStuntedBoy = assessHeightForAge(36, "male", 90);
  assert.equal(shortButNotStuntedBoy.growthStatus, "within_range");
  assert.equal(shortButNotStuntedBoy.stuntingScreening, "not_indicated");
  assert.ok(
    shortButNotStuntedBoy.heightForAgeZ < -1 &&
      shortButNotStuntedBoy.heightForAgeZ >= -2,
  );

  const stuntedGirl = assessHeightForAge(36, "female", 86);
  assert.equal(stuntedGirl.growthStatus, "stunted");
  assert.equal(stuntedGirl.stuntingScreening, "indicated");
  assert.ok(stuntedGirl.heightForAgeZ < -2 && stuntedGirl.heightForAgeZ >= -3);

  const severeGirl = assessHeightForAge(36, "female", 82);
  assert.equal(severeGirl.growthStatus, "severely_stunted");
  assert.equal(severeGirl.stuntingScreening, "severe");
  assert.ok(severeGirl.heightForAgeZ < -3);
});

test("WHO infant length-for-age uses PB/U for children under 24 months", () => {
  const newbornBoy = assessLengthForAge(0, "male", 49.8842);
  assert.equal(newbornBoy.heightForAgeZ, 0);
  assert.equal(newbornBoy.growthStatus, "within_range");

  const twelveMonthBoy = assessLengthForAge(12, "male", 75.7488);
  assert.equal(twelveMonthBoy.heightForAgeZ, 0);
  assert.equal(twelveMonthBoy.growthStatus, "within_range");

  const stuntedBoy = assessLengthForAge(12, "male", 70);
  assert.equal(stuntedBoy.growthStatus, "stunted");
  assert.ok(stuntedBoy.heightForAgeZ < -2);
  assert.ok(stuntedBoy.heightForAgeZ >= -3);

  const severeBoy = assessLengthForAge(12, "male", 67);
  assert.equal(severeBoy.growthStatus, "severely_stunted");
  assert.ok(severeBoy.heightForAgeZ < -3);

  assert.equal(linearGrowthIndicator(12), "PB/U");
  assert.equal(linearGrowthIndicator(24), "TB/U");
  assert.match(growthStatusLabelForAge("within_range", 12), /PB\/U ≥ -2 SD/);
});

test("infant report labels PB/U and includes official result sources", () => {
  const baseReport = createScreeningReport(
    child,
    { heightCm: 96.1, weightKg: 15 },
    missingCapture,
    completedAt,
  );
  const report = {
    ...baseReport,
    child: { ...baseReport.child, ageMonths: 20 },
    readings: { heightCm: 78, weightKg: 10 },
    bmi: null,
    heightForAgeZ: -2.2,
    weightForAgeZ: -1.13,
    growthStatus: "stunted",
    stuntingScreening: "indicated",
  };
  const text = reportText(report);

  assert.match(text, /Panjang badan: 78 cm/);
  assert.match(text, /PB\/U Z-score WHO: -2.2/);
  assert.match(text, /Stunting ditentukan dari PB\/U/);
  assert.match(text, /WHO Child Growth Standards/);
  assert.match(text, /Buku KIA Edisi 2024/);
});

test("infant anthropometry calculates PB/U and BB/U from WHO age-sex references", () => {
  const result = assessAnthropometry(12, "male", 75.7488, 9.6479);
  assert.equal(result.measurementQuality, "valid");
  assert.equal(result.heightForAgeZ, 0);
  assert.equal(result.weightForAgeZ, 0);
  assert.equal(result.growthStatus, "within_range");
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

test("anthropometry flags biologically implausible weight before producing a WHO result", () => {
  const waz = weightForAgeZScore(48, "male", 1.9);
  assert.ok(waz !== null && waz < -6);

  const result = assessAnthropometry(48, "male", 106, 1.9);
  assert.equal(result.measurementQuality, "recheck");
  assert.equal(result.growthStatus, "unavailable");
  assert.equal(result.stuntingScreening, null);
  assert.equal(result.heightForAgeZ, null);
  assert.match(result.measurementReason || "", /Berat badan/);
  assert.match(result.measurementReason || "", /ulangi pengukuran/i);
});

test("anthropometry keeps plausible measurements available for TB/U screening", () => {
  const result = assessAnthropometry(48, "male", 106, 16.3);
  assert.equal(result.measurementQuality, "valid");
  assert.equal(result.growthStatus, "within_range");
  assert.equal(result.stuntingScreening, "not_indicated");
  assert.ok(result.heightForAgeZ !== null);
  assert.ok(result.weightForAgeZ !== null);
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
  assert.equal(report.weightForAgeZ, null);
  assert.equal(report.measurementQuality, "incomplete");
  assert.equal(report.growthStatus, "unavailable");
  assert.equal(report.stuntingScreening, null);
  assert.equal(report.facialAnalysis.status, "unavailable");
  assert.match(reportText(report), /TB\/U Z-score WHO: —/);
  assert.match(reportText(report), /Tinggi badan: — cm/);
  assert.match(reportText(report), /Permenkes No\. 2 Tahun 2020/);
  assert.match(reportText(report), /Buku KIA Edisi 2024/);
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
  assert.equal(report.measurementQuality, "valid");
  assert.equal(report.growthStatus, "within_range");

  const partial = createScreeningReport(
    child,
    { heightCm: 96.0835, weightKg: null },
    missingCapture,
    completedAt,
  );
  assert.equal(partial.bmi, null);
  assert.equal(partial.heightForAgeZ, 0);
  assert.equal(partial.weightForAgeZ, null);
  assert.equal(partial.measurementQuality, "incomplete");
  assert.equal(partial.growthStatus, "within_range");
});

test("raw camera photos are not retained in reports or exported text", () => {
  const capture = {
    status: "captured",
    photo: new Blob(["private-photo"], { type: "image/jpeg" }),
    facialAnalysis: {
      status: "non_stunting_indication",
      probability: 0.21,
      threshold: 0.4,
      reason: null,
      modelVersion: "model-a-v2.1",
    },
  };
  const report = createScreeningReport(
    child,
    readMeasurements(),
    capture,
    completedAt,
  );
  assert.equal(report.captureStatus, "captured");
  assert.equal(report.facialAnalysis.status, "non_stunting_indication");
  assert.equal(Object.hasOwn(report, "photo"), false);
  assert.doesNotMatch(reportText(report), /private-photo/);
});

test("Gemini visual observations are retained without persisting the raw photo", () => {
  const capture = {
    status: "captured",
    photo: new Blob(["private-visual-photo"], { type: "image/jpeg" }),
    visualAnalysis: {
      status: "ok",
      faceDetected: true,
      singleFace: true,
      eyes: "visible",
      nose: "visible",
      mouth: "visible",
      facePosition: "frontal",
      lighting: "good",
      observations: ["Wajah berada di tengah frame."],
      reason: null,
      modelVersion: "gemini:test",
    },
  };

  const report = createScreeningReport(
    child,
    { heightCm: 96.1, weightKg: 15 },
    capture,
    completedAt,
  );

  assert.equal(report.visualAnalysis.status, "ok");
  assert.equal(report.visualAnalysis.eyes, "visible");
  assert.equal(Object.hasOwn(report, "photo"), false);
  assert.match(reportText(report), /ANALISIS VISUAL AI/);
  assert.doesNotMatch(reportText(report), /private-visual-photo/);
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
