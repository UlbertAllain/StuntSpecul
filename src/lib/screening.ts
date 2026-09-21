import { z } from "zod";
import {
  assessHeightForAge,
  type GrowthStatus,
  type StuntingScreening,
} from "./growth.ts";
import {
  demoMeasurementsEnabled,
  generateDemoMeasurements,
} from "./demo-measurements.ts";

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

export type FacialAnalysisStatus =
  | "stunting_indication"
  | "non_stunting_indication"
  | "rejected"
  | "unavailable";

export type FacialAnalysis = {
  status: FacialAnalysisStatus;
  probability: number | null;
  threshold: number | null;
  reason: string | null;
  modelVersion: string | null;
};

export const UNAVAILABLE_FACIAL_ANALYSIS: FacialAnalysis = {
  status: "unavailable",
  probability: null,
  threshold: null,
  reason: null,
  modelVersion: null,
};

export type Child = z.infer<typeof childSchema>;
export type Readings = z.infer<typeof readingsSchema>;
export type Capture =
  | {
      status: "captured";
      photo: Blob;
      facialAnalysis: FacialAnalysis;
    }
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
  facialAnalysis: FacialAnalysis;
};

// Production keeps missing sensors as missing data. Local demo mode can
// temporarily exercise the full WHO/report/history pipeline before hardware arrives.
export function readMeasurements(child?: Child): Readings {
  if (child && demoMeasurementsEnabled()) {
    const demo = generateDemoMeasurements(child);
    return { heightCm: demo.heightCm, weightKg: demo.weightKg };
  }

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
    facialAnalysis:
      capture.status === "captured"
        ? capture.facialAnalysis
        : UNAVAILABLE_FACIAL_ANALYSIS,
  };
}

export function facialAnalysisLabel(
  status: FacialAnalysisStatus | null,
): string {
  switch (status) {
    case "stunting_indication":
      return "Terindikasi stunting";
    case "non_stunting_indication":
      return "Tidak terindikasi stunting";
    case "rejected":
      return "Foto tidak memenuhi kualitas";
    default:
      return "Belum tersedia";
  }
}

export function facialReasonLabel(reason: string | null): string {
  switch (reason) {
    case "blur":
      return "Foto terlalu buram.";
    case "too_dark":
      return "Pencahayaan terlalu gelap.";
    case "too_bright":
      return "Pencahayaan terlalu terang.";
    case "no_face":
      return "Wajah belum terdeteksi.";
    case "multiple_faces":
      return "Terdeteksi lebih dari satu wajah.";
    case "face_too_small":
      return "Wajah terlalu jauh dari kamera.";
    case "age_out_of_scope":
      return "Usia di luar cakupan Model A.";
    case "model_not_ready":
      return "Model analisis wajah belum tersedia.";
    default:
      return reason ? "Foto tidak dapat dianalisis." : "Belum tersedia.";
  }
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
