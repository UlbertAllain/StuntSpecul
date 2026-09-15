import { z } from "zod";
import {
  assessHeightForAge,
  type GrowthStatus,
  type StuntingScreening,
} from "./growth.ts";

export const childSchema = z.object({
  ageMonths: z
    .number({ invalid_type_error: "Isi usia dalam bulan penuh." })
    .int("Usia harus dalam bulan penuh.")
    .min(24, "Pemeriksaan berdiri ini untuk anak mulai usia 24 bulan.")
    .max(59, "Pengukuran ini untuk anak di bawah 5 tahun."),
  sex: z.enum(["male", "female"]),
  canStand: z.literal(true, {
    errorMap: () => ({ message: "Anak perlu bisa berdiri tanpa bantuan." }),
  }),
});

const readingsSchema = z.object({
  heightCm: z.number().finite().positive().nullable(),
  weightKg: z.number().finite().positive().nullable(),
});

export type Child = z.infer<typeof childSchema>;
export type Readings = z.infer<typeof readingsSchema>;
export type Capture =
  | { status: "captured"; photo: Blob }
  | { status: "skipped" | "failed" };

export type ScreeningReport = {
  child: Child;
  readings: Readings;
  completedAt: string;
  bmi: number | null;
  heightForAgeZ: number | null;
  captureStatus: Capture["status"];
  growthStatus: GrowthStatus;
  stuntingScreening: StuntingScreening;
  facialStatus: "unavailable";
};

// Missing devices must remain missing data; never substitute fixture readings.
export function readMeasurements(): Readings {
  return { heightCm: null, weightKg: null };
}

export function createScreeningReport(
  child: Child,
  readings: Readings,
  capture: Capture,
  completedAt = new Date().toISOString(),
): ScreeningReport {
  const validatedChild = childSchema.parse(child);
  const validatedReadings = readingsSchema.parse(readings);
  if (!Number.isFinite(Date.parse(completedAt))) {
    throw new Error("Waktu pemeriksaan tidak valid.");
  }

  const { heightCm, weightKg } = validatedReadings;
  const bmi =
    heightCm !== null && weightKg !== null
      ? Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10
      : null;

  if (bmi !== null && !Number.isFinite(bmi)) {
    throw new Error("Data pengukuran tidak valid.");
  }

  const growth = assessHeightForAge(
    validatedChild.ageMonths,
    validatedChild.sex,
    heightCm,
  );

  return {
    child: validatedChild,
    readings: validatedReadings,
    completedAt,
    bmi,
    heightForAgeZ: growth.heightForAgeZ,
    captureStatus: capture.status,
    growthStatus: growth.growthStatus,
    stuntingScreening: growth.stuntingScreening,
    facialStatus: "unavailable",
  };
}

export function formatAge(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return [
    years ? `${years} tahun` : "",
    remainingMonths || !years ? `${remainingMonths} bulan` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function formatReading(value: number | null): string {
  return value === null ? "—" : String(value);
}
