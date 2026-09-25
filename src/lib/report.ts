import { growthStatusLabel, stuntingScreeningLabel } from "./growth.ts";
import { growthRecommendationsFor } from "./growth-recommendations.ts";
import {
  facialAnalysisLabel,
  facialReasonLabel,
  formatAge,
  formatReading,
  type ScreeningReport,
} from "./screening.ts";

export const WHO_REFERENCE_URL =
  "https://www.who.int/tools/child-growth-standards/standards/length-height-for-age";

export function reportText(report: ScreeningReport): string {
  const recommendations = growthRecommendationsFor(report.growthStatus);
  const facial = report.facialAnalysis;
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
    "SKRINING WAJAH AI — MODEL A V2.1",
    `Hasil: ${facialAnalysisLabel(facial.status)}`,
    facial.probability === null
      ? "Skor model: —"
      : `Skor model: ${Math.round(facial.probability * 100)}%`,
    facial.status === "rejected"
      ? `Catatan: ${facialReasonLabel(facial.reason)}`
      : "",
    "",
    "REKOMENDASI NUTRISI",
    ...recommendations.nutrition.map((item, index) => `${index + 1}. ${item}`),
    "",
    "PENANGANAN / LANGKAH SELANJUTNYA",
    ...recommendations.nextSteps.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Hasil ini merupakan skrining, bukan diagnosis. TB/U WHO merupakan hasil utama untuk skrining stunting. Analisis wajah adalah indikator eksperimental tambahan.",
    "Foto wajah tidak disertakan dalam laporan.",
    `Referensi: ${WHO_REFERENCE_URL}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function downloadReport(report: ScreeningReport): void {
  const blob = new Blob([reportText(report)], {
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
