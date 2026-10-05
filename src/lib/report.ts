import { growthStatusLabel, stuntingScreeningLabel } from "./growth.ts";
import {
  KEMENKES_ANTHROPOMETRY_REFERENCE_URL,
  KIA_2024_REFERENCE_URL,
  WHO_LENGTH_HEIGHT_REFERENCE_URL,
} from "./growth-references.ts";
import {
  growthRecommendationsFor,
  type GrowthRecommendations,
} from "./growth-recommendations.ts";
import {
  facialAnalysisLabel,
  facialReasonLabel,
  formatAge,
  formatReading,
  visualAnalysisStatusLabel,
  visualFacePositionLabel,
  visualLightingLabel,
  visualVisibilityLabel,
  type ScreeningReport,
} from "./screening.ts";

export const WHO_REFERENCE_URL = WHO_LENGTH_HEIGHT_REFERENCE_URL;
export const KEMENKES_REFERENCE_URL = KEMENKES_ANTHROPOMETRY_REFERENCE_URL;
export const KIA_REFERENCE_URL = KIA_2024_REFERENCE_URL;

export function reportText(
  report: ScreeningReport,
  savedRecommendations?: GrowthRecommendations | null,
): string {
  const recommendations =
    savedRecommendations ??
    growthRecommendationsFor(report.growthStatus, {
      ageMonths: report.child.ageMonths,
      currentHeightForAgeZ: report.heightForAgeZ,
      currentAt: Date.parse(report.completedAt),
    });
  const facial = report.facialAnalysis;
  const visual = report.visualAnalysis;
  const visualLines = visual
    ? [
        "ANALISIS VISUAL AI — PENDUKUNG",
        `Status foto: ${visualAnalysisStatusLabel(visual.status)}`,
        `Mata: ${visualVisibilityLabel(visual.eyes)}`,
        `Hidung: ${visualVisibilityLabel(visual.nose)}`,
        `Mulut: ${visualVisibilityLabel(visual.mouth)}`,
        `Posisi wajah: ${visualFacePositionLabel(visual.facePosition)}`,
        `Pencahayaan: ${visualLightingLabel(visual.lighting)}`,
        ...visual.observations.map((item) => `Observasi: ${item}`),
        visual.reason ? `Catatan: ${visual.reason}` : "",
        "AI visual tidak menentukan status stunting.",
      ]
    : [
        "SKRINING WAJAH LEGACY — MODEL A V2.1",
        `Hasil: ${facialAnalysisLabel(facial.status)}`,
        facial.probability === null
          ? "Skor model: —"
          : `Skor model: ${Math.round(facial.probability * 100)}%`,
        facial.status === "rejected"
          ? `Catatan: ${facialReasonLabel(facial.reason)}`
          : "",
      ];
  return [
    "STUNTSPECULA — HASIL SCREENING",
    "",
    `Usia: ${formatAge(report.child.ageMonths)}`,
    `Jenis kelamin: ${report.child.sex === "male" ? "Laki-laki" : "Perempuan"}`,
    `Waktu: ${new Date(report.completedAt).toLocaleString("id-ID")}`,
    `Tinggi badan: ${formatReading(report.readings.heightCm)} cm`,
    `Berat badan: ${formatReading(report.readings.weightKg)} kg`,
    `IMT: ${formatReading(report.bmi)} kg/m²`,
    `TB/U Z-score WHO: ${formatReading(report.heightForAgeZ)}`,
    `BB/U Z-score WHO: ${formatReading(report.weightForAgeZ)}`,
    `Validitas pengukuran: ${
      report.measurementQuality === "recheck"
        ? "Perlu diulang"
        : report.measurementQuality === "incomplete"
          ? "Belum lengkap"
          : "Valid"
    }`,
    report.measurementReason
      ? `Catatan pengukuran: ${report.measurementReason}`
      : "",
    "",
    `Status pertumbuhan: ${
      report.measurementQuality === "recheck"
        ? "Belum dapat disimpulkan"
        : growthStatusLabel(report.growthStatus)
    }`,
    `Skrining stunting WHO: ${stuntingScreeningLabel(report.stuntingScreening)}`,
    "",
    ...visualLines,
    "",
    "PREDIKSI RISIKO STUNTING BERBASIS TREN",
    "Status: " + recommendations.risk.label,
    recommendations.risk.zChangePer30Days === null
      ? "Perubahan TB/U per 30 hari: —"
      : "Perubahan TB/U per 30 hari: " +
        recommendations.risk.zChangePer30Days.toFixed(2) +
        " SD",
    recommendations.risk.projectedHeightForAgeZ === null
      ? "Proyeksi TB/U 90 hari: —"
      : "Proyeksi TB/U 90 hari: " +
        recommendations.risk.projectedHeightForAgeZ.toFixed(2) +
        " SD",
    ...recommendations.risk.reasons.map((item) => "- " + item),
    recommendations.risk.disclaimer,
    "",
    "REKOMENDASI NUTRISI LOKAL",
    ...recommendations.nutrition.map(
      (item, index) => String(index + 1) + ". " + item,
    ),
    "",
    "CONTOH MENU — " + recommendations.localizedNutrition.ageBand,
    ...recommendations.localizedNutrition.sampleDay.map(
      (meal) => meal.slot + ": " + meal.menu,
    ),
    ...recommendations.localizedNutrition.cautions.map(
      (item) => "Catatan: " + item,
    ),
    "",
    "PENANGANAN / LANGKAH SELANJUTNYA",
    ...recommendations.nextSteps.map((item, index) => `${index + 1}. ${item}`),
    recommendations.trendDelta === null
      ? ""
      : `Perbandingan TB/U sebelumnya: ${
          recommendations.trend === "declining"
            ? "turun"
            : recommendations.trend === "improving"
              ? "naik"
              : "relatif stabil"
        } ${Math.abs(recommendations.trendDelta).toFixed(2)} SD.`,
    "",
    "Hasil ini merupakan skrining, bukan diagnosis. Stunting ditentukan dari TB/U. BB/U digunakan sebagai indikator tambahan dan validasi pengukuran; analisis visual AI tidak menentukan status stunting.",
    "Acuan perhitungan: Standar Antropometri Anak Kemenkes RI (Permenkes No. 2 Tahun 2020) dan WHO Child Growth Standards.",
    "Buku KIA Edisi 2024 digunakan sebagai referensi pendamping pemantauan pertumbuhan keluarga, bukan sebagai pengganti perhitungan Z-score.",
    "Foto wajah tidak disertakan dalam laporan.",
    `Referensi Kemenkes Antropometri: ${KEMENKES_REFERENCE_URL}`,
    `Referensi Buku KIA 2024: ${KIA_REFERENCE_URL}`,
    `Referensi WHO: ${WHO_REFERENCE_URL}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function downloadReport(
  report: ScreeningReport,
  recommendations?: GrowthRecommendations | null,
): void {
  const blob = new Blob([reportText(report, recommendations)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = url;
    anchor.download = "stuntspecula-hasil-screening.txt";
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
}
