import {
  followUpForGrowthStatus,
  growthStatusLabel,
  stuntingScreeningLabel,
} from "./growth.ts";
import { formatAge, formatReading, type ScreeningReport } from "./screening.ts";

export const WHO_REFERENCE_URL =
  "https://www.who.int/tools/child-growth-standards/standards/length-height-for-age";

export function reportText(report: ScreeningReport): string {
  const followUp = followUpForGrowthStatus(report.growthStatus);
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
    `Skrining stunting: ${stuntingScreeningLabel(report.stuntingScreening)}`,
    "",
    "LANGKAH SELANJUTNYA",
    ...followUp.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Analisis area mata: Belum tersedia",
    "Analisis kantong mata: Belum tersedia",
    "Analisis bibir: Belum tersedia",
    "",
    "Hasil ini merupakan skrining, bukan diagnosis. Hasil yang terindikasi perlu dikonfirmasi oleh tenaga kesehatan.",
    "Foto wajah tidak disertakan dalam laporan dan tidak menentukan status stunting.",
    `Referensi: ${WHO_REFERENCE_URL}`,
  ].join("\n");
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
