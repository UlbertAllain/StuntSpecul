import type { GrowthStatus } from "./growth.ts";

export const STUNTING_RISK_VERSION = "stunting-risk-v2";
export const STUNTING_RISK_HORIZON_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_TREND_SPAN_DAYS = 28;

export type LinearGrowthIndicator = "PB/U" | "TB/U";

export type StuntingRiskLevel =
  | "insufficient_data"
  | "low"
  | "watch"
  | "high"
  | "current_stunting";

export type StuntingRiskPoint = {
  at: number;
  heightForAgeZ: number;
};

export type StuntingRiskAssessment = {
  version: string;
  indicator: LinearGrowthIndicator;
  level: StuntingRiskLevel;
  label: string;
  currentHeightForAgeZ: number | null;
  pointsUsed: number;
  spanDays: number | null;
  zChangePer30Days: number | null;
  projectionHorizonDays: number | null;
  projectedHeightForAgeZ: number | null;
  reasons: string[];
  disclaimer: string;
};

export type StuntingRiskContext = {
  growthStatus: GrowthStatus;
  currentHeightForAgeZ: number | null;
  indicator?: LinearGrowthIndicator;
  currentAt?: number | null;
  history?: StuntingRiskPoint[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function isPoint(value: StuntingRiskPoint) {
  return (
    Number.isFinite(value.at) &&
    value.at > 0 &&
    Number.isFinite(value.heightForAgeZ)
  );
}

function uniqueChronologicalPoints(
  history: StuntingRiskPoint[],
  currentAt: number | null,
  currentHeightForAgeZ: number,
) {
  const byTime = new Map<number, StuntingRiskPoint>();
  for (const point of history) {
    if (isPoint(point)) byTime.set(point.at, point);
  }
  if (currentAt !== null && Number.isFinite(currentAt) && currentAt > 0) {
    byTime.set(currentAt, {
      at: currentAt,
      heightForAgeZ: currentHeightForAgeZ,
    });
  }
  return [...byTime.values()].sort((a, b) => a.at - b.at);
}

function regressionSlopePerDay(points: StuntingRiskPoint[]) {
  const origin = points[0]?.at;
  if (origin === undefined || points.length < 2) return null;

  const samples = points.map((point) => ({
    x: (point.at - origin) / DAY_MS,
    y: point.heightForAgeZ,
  }));
  const meanX =
    samples.reduce((sum, point) => sum + point.x, 0) / samples.length;
  const meanY =
    samples.reduce((sum, point) => sum + point.y, 0) / samples.length;
  const numerator = samples.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
    0,
  );
  const denominator = samples.reduce(
    (sum, point) => sum + (point.x - meanX) ** 2,
    0,
  );

  if (denominator === 0) return null;
  return numerator / denominator;
}

function result(
  context: StuntingRiskContext,
  level: StuntingRiskLevel,
  label: string,
  details: Partial<StuntingRiskAssessment> = {},
): StuntingRiskAssessment {
  const indicator = context.indicator ?? "TB/U";
  return {
    version: STUNTING_RISK_VERSION,
    indicator,
    level,
    label,
    currentHeightForAgeZ: context.currentHeightForAgeZ,
    pointsUsed: details.pointsUsed ?? 0,
    spanDays: details.spanDays ?? null,
    zChangePer30Days: details.zChangePer30Days ?? null,
    projectionHorizonDays: details.projectionHorizonDays ?? null,
    projectedHeightForAgeZ: details.projectedHeightForAgeZ ?? null,
    reasons: details.reasons ?? [],
    disclaimer: `Prediksi ini adalah proyeksi tren ${indicator} untuk skrining awal, bukan probabilitas klinis, diagnosis, atau pengganti penilaian tenaga kesehatan.`,
  };
}

export function stuntingRiskFor(
  context: StuntingRiskContext,
): StuntingRiskAssessment {
  const current = context.currentHeightForAgeZ;
  const indicator = context.indicator ?? "TB/U";

  if (current === null || !Number.isFinite(current)) {
    return result(
      context,
      "insufficient_data",
      `Prediksi belum tersedia — ${indicator} belum valid`,
      {
        reasons: [`${indicator} saat ini belum tersedia atau belum valid.`],
      },
    );
  }

  if (
    context.growthStatus === "stunted" ||
    context.growthStatus === "severely_stunted" ||
    current < -2
  ) {
    return result(
      context,
      "current_stunting",
      "Stunting terindikasi saat ini — bukan prediksi",
      {
        reasons: [
          `${indicator} saat ini sudah berada di bawah -2 SD, sehingga yang ditampilkan adalah status pertumbuhan saat ini, bukan prediksi risiko baru.`,
        ],
      },
    );
  }

  const points = uniqueChronologicalPoints(
    context.history ?? [],
    context.currentAt ?? null,
    current,
  );
  if (points.length < 2) {
    return result(
      context,
      "insufficient_data",
      "Prediksi belum tersedia — butuh ≥2 pemeriksaan",
      {
        pointsUsed: points.length,
        reasons: [
          `Minimal dua pemeriksaan ${indicator} diperlukan untuk membuat proyeksi tren.`,
        ],
      },
    );
  }

  const spanDays = (points.at(-1)!.at - points[0].at) / DAY_MS;
  if (spanDays < MIN_TREND_SPAN_DAYS) {
    return result(
      context,
      "insufficient_data",
      "Prediksi belum tersedia — jarak data <28 hari",
      {
        pointsUsed: points.length,
        spanDays: round2(spanDays),
        reasons: [
          "Rentang data kurang dari 28 hari. Pantau lagi pada pemeriksaan berkala berikutnya agar perubahan jangka sangat pendek tidak dibaca sebagai tren.",
        ],
      },
    );
  }

  const slopePerDay = regressionSlopePerDay(points);
  if (slopePerDay === null || !Number.isFinite(slopePerDay)) {
    return result(
      context,
      "insufficient_data",
      "Prediksi belum tersedia — tren belum dapat dihitung",
      {
        pointsUsed: points.length,
        spanDays: round2(spanDays),
        reasons: ["Data waktu pemeriksaan belum cukup untuk menghitung tren."],
      },
    );
  }

  const zChangePer30Days = round2(slopePerDay * 30);
  const projectedHeightForAgeZ = round2(
    current + slopePerDay * STUNTING_RISK_HORIZON_DAYS,
  );
  const common = {
    pointsUsed: points.length,
    spanDays: round2(spanDays),
    zChangePer30Days,
    projectionHorizonDays: STUNTING_RISK_HORIZON_DAYS,
    projectedHeightForAgeZ,
  };

  if (projectedHeightForAgeZ < -2) {
    return result(
      context,
      "high",
      "Tren 90 hari diproyeksikan melewati -2 SD",
      {
        ...common,
        reasons: [
          `Jika pola ${indicator} terakhir berlanjut secara linear, proyeksi 90 hari melewati batas -2 SD.`,
          "Kecepatan perubahan tren sekitar " +
            zChangePer30Days.toFixed(2) +
            " SD per 30 hari.",
        ],
      },
    );
  }

  if (zChangePer30Days < -0.1) {
    return result(
      context,
      "watch",
      `${indicator} menurun, tetapi belum diproyeksikan stunting`,
      {
        ...common,
        reasons: [
          `${indicator} menunjukkan tren menurun, tetapi proyeksi 90 hari belum melewati batas -2 SD.`,
          "Kecepatan perubahan tren sekitar " +
            zChangePer30Days.toFixed(2) +
            " SD per 30 hari.",
        ],
      },
    );
  }

  return result(context, "low", "Tren 90 hari tidak mengarah ke stunting", {
    ...common,
    reasons: [
      `Tren ${indicator} tidak memproyeksikan lintasan ke bawah -2 SD dalam 90 hari bila pola yang sama berlanjut.`,
    ],
  });
}
