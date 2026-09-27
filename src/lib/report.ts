import { growthStatusLabel, stuntingScreeningLabel } from "./growth.ts";
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

export const WHO_REFERENCE_URL =
  "https://www.who.int/tools/child-growth-standards/standards/length-height-for-age";

export function reportText(
  report: ScreeningReport,
  savedRecommendations?: GrowthRecommendations | null,
): string {
  const recommendations =
    savedRecommendations ??
    growthRecommendationsFor(report.growthStatus, {
      currentHeightForAgeZ: report.heightForAgeZ,
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
    "",
    `Status pertumbuhan: ${growthStatusLabel(report.growthStatus)}`,
    `Skrining stunting WHO: ${stuntingScreeningLabel(report.stuntingScreening)}`,
    "",
    ...visualLines,
    "",
    "REKOMENDASI NUTRISI",
    ...recommendations.nutrition.map((item, index) => `${index + 1}. ${item}`),
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
    "Hasil ini merupakan skrining, bukan diagnosis. TB/U WHO merupakan hasil utama untuk skrining stunting. Analisis visual AI hanya mendeskripsikan kualitas foto dan bagian wajah yang terlihat.",
    "Foto wajah tidak disertakan dalam laporan.",
    `Referensi: ${WHO_REFERENCE_URL}`,
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
