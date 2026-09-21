"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Ruler,
  Scale,
} from "lucide-react";

import {
  assessHeightForAge,
  growthStatusLabel,
  type GrowthStatus,
} from "@/lib/growth";
import { ageInMonths, type ChildProfile, type Examination } from "@/lib/portal";
import { formatReading } from "@/lib/screening";

const MAX_POINTS = 6;

type MetricKey = "heightCm" | "weightKg" | "heightForAgeZ";
type TrendTone = "up" | "stable" | "down" | "unavailable";

type ChartPoint = {
  value: number;
  date: number;
};

type ReferenceLine = {
  value: number;
  label: string;
};

function sameChildExams(examinations: Examination[]) {
  const latest = examinations[0];

  if (!latest) return [];

  return examinations.filter((exam) => exam.childId === latest.childId);
}

function chronological(examinations: Examination[]) {
  return [...examinations]
    .sort(
      (a, b) => (a.completedAt || a.createdAt) - (b.completedAt || b.createdAt),
    )
    .slice(-MAX_POINTS);
}

function metricValues(
  examinations: Examination[],
  key: MetricKey,
): ChartPoint[] {
  return chronological(examinations)
    .map((exam) => ({
      value: exam[key],
      date: exam.completedAt || exam.createdAt,
    }))
    .filter(
      (item): item is ChartPoint =>
        typeof item.value === "number" && Number.isFinite(item.value),
    );
}

function delta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return current - previous;
}

function signed(value: number, digits = 1) {
  const formatted = value.toFixed(digits);
  return value > 0 ? `+${formatted}` : formatted;
}

function zTrend(latest: Examination, previous: Examination | undefined) {
  if (
    latest.heightForAgeZ === null ||
    previous?.heightForAgeZ === null ||
    !previous
  ) {
    return {
      tone: "unavailable" as TrendTone,
      title: "Belum cukup data untuk membaca tren",
      text: "Minimal dua pemeriksaan diperlukan untuk membandingkan perubahan nilai TB/U.",
    };
  }

  const change = latest.heightForAgeZ - previous.heightForAgeZ;

  if (change > 0) {
    return {
      tone: "up" as TrendTone,
      title: "Nilai TB/U meningkat dari pemeriksaan sebelumnya",
      text: `Perubahan tercatat ${signed(change, 2)} SD. Bandingkan bersama status skrining terbaru.`,
    };
  }

  if (change < 0) {
    return {
      tone: "down" as TrendTone,
      title: "Nilai TB/U menurun dari pemeriksaan sebelumnya",
      text: `Perubahan tercatat ${signed(change, 2)} SD. Pantau pemeriksaan selanjutnya dan ikuti arahan petugas kesehatan bila diperlukan.`,
    };
  }

  return {
    tone: "stable" as TrendTone,
    title: "Nilai TB/U sama dengan pemeriksaan sebelumnya",
    text: "Belum ada perubahan nilai TB/U dibanding pemeriksaan sebelumnya.",
  };
}

function demoHeight(ageMonths: number, sex: "male" | "female") {
  const base = sex === "male" ? 87.1 : 85.7;
  const monthlyGrowth = sex === "male" ? 0.65 : 0.68;
  return Number((base + Math.max(0, ageMonths - 24) * monthlyGrowth).toFixed(1));
}

function demoWeight(ageMonths: number) {
  return Number((12.4 + Math.max(0, ageMonths - 24) * 0.18).toFixed(1));
}

function demoExamination(
  child: ChildProfile,
  ageMonths: number,
  heightCm: number,
  weightKg: number,
  timestamp: number,
  index: number,
): Examination {
  const assessment = assessHeightForAge(ageMonths, child.sex, heightCm);
  return {
    id: `demo-${child.id}-${index}`,
    childId: child.id,
    childName: child.name,
    childCode: child.code,
    ageMonths,
    sex: child.sex,
    deviceId: "demo",
    deviceName: "Visualisasi demo",
    status: "completed",
    heightCm,
    weightKg,
    bmi: Number((weightKg / (heightCm / 100) ** 2).toFixed(1)),
    heightForAgeZ: assessment.heightForAgeZ,
    captureStatus: "skipped",
    facialStatus: null,
    facialProbability: null,
    facialReason: null,
    facialModelVersion: null,
    growthStatus: assessment.growthStatus,
    createdAt: timestamp,
    completedAt: timestamp,
    finalizedAt: timestamp,
  };
}

function displaySeries(examinations: Examination[], child: ChildProfile | null) {
  const real = sameChildExams(examinations);
  if (real.length >= 2 || !child) return { exams: real, demo: false };

  const currentAge = real[0]?.ageMonths ?? ageInMonths(child.birthDate);
  if (currentAge < 24 || currentAge > 59)
    return { exams: real, demo: false };

  const latestHeight =
    real[0]?.heightCm ?? demoHeight(currentAge, child.sex);
  const latestWeight = real[0]?.weightKg ?? demoWeight(currentAge);
  const latestTimestamp =
    real[0]?.completedAt || real[0]?.createdAt || Date.now();

  const generated = [1, 2, 3].map((monthsBack, index) => {
    const age = Math.max(24, currentAge - monthsBack);
    const timestamp =
      latestTimestamp - monthsBack * 30 * 24 * 60 * 60 * 1000;
    const height = Number(
      Math.max(
        30,
        latestHeight - monthsBack * (child.sex === "male" ? 0.65 : 0.68),
      ).toFixed(1),
    );
    const weight = Number(
      Math.max(1, latestWeight - monthsBack * 0.18).toFixed(1),
    );
    return demoExamination(child, age, height, weight, timestamp, index);
  });

  if (real[0]) return { exams: [real[0], ...generated], demo: true };

  const current = demoExamination(
    child,
    currentAge,
    latestHeight,
    latestWeight,
    latestTimestamp,
    3,
  );
  return { exams: [current, ...generated], demo: true };
}

function riskLabel(status: GrowthStatus) {
  switch (status) {
    case "within_range":
      return "Tidak terindikasi";
    case "monitor":
      return "Perlu dipantau";
    case "stunted":
      return "Terindikasi stunting";
    case "severely_stunted":
      return "Terindikasi stunting berat";
    default:
      return "Belum tersedia";
  }
}

function zMarker(z: number | null) {
  if (z === null) return 50;
  return Math.max(0, Math.min(100, ((z + 4) / 5) * 100));
}

function formatShortDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function formatMonth(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  });
}

function GrowthLineChart({
  title,
  description,
  unit,
  values,
  decimals = 1,
  referenceLines = [],
}: {
  title: string;
  description: string;
  unit: string;
  values: ChartPoint[];
  decimals?: number;
  referenceLines?: ReferenceLine[];
}) {
  if (values.length === 0) {
    return (
      <article className="rounded-[1.5rem] border border-[var(--border)] bg-white p-5">
        <h3 className="text-lg font-black">{title}</h3>
        <p className="portal-note mt-1">{description}</p>
        <div className="mt-8 flex min-h-48 items-center justify-center rounded-2xl bg-[var(--blue-soft)]/40">
          <div className="text-center">
            <ChartNoAxesCombined
              className="mx-auto text-[var(--blue)]"
              size={28}
            />
            <p className="portal-note mt-3">
              Belum ada data untuk ditampilkan.
            </p>
          </div>
        </div>
      </article>
    );
  }

  const chartWidth = 520;
  const chartHeight = 260;
  const paddingLeft = 42;
  const paddingRight = 18;
  const paddingTop = 30;
  const paddingBottom = 52;
  const allValues = [
    ...values.map((item) => item.value),
    ...referenceLines.map((line) => line.value),
  ];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const rawRange = rawMax - rawMin;
  const extraRange = Math.max(
    rawRange * 0.2,
    Math.abs(rawMax || rawMin || 1) * 0.05,
    unit === "SD" ? 0.4 : 0.5,
  );
  const min = rawMin - extraRange;
  const max = rawMax + extraRange;
  const range = Math.max(max - min, 0.1);
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const getY = (value: number) =>
    paddingTop + ((max - value) / range) * plotHeight;
  const points = values.map((item, index) => {
    const x =
      values.length === 1
        ? paddingLeft + plotWidth / 2
        : paddingLeft + (index / (values.length - 1)) * plotWidth;
    return { ...item, x, y: getY(item.value) };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const latest = values.at(-1)!;
  const horizontalGrid = Array.from({ length: 4 }).map((_, index) => {
    const ratio = index / 3;
    return {
      y: paddingTop + ratio * plotHeight,
      value: max - ratio * range,
    };
  });
  const gradientId = `area-${title.replaceAll(" ", "-").replaceAll("/", "-")}`;

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fcff_52%,#fff7fa_100%)] shadow-[0_14px_38px_rgba(78,139,196,0.08)]">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black">{title}</h3>
          <p className="portal-note mt-1">{description}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-[var(--blue-soft)] px-4 py-3 text-right">
          <span className="block text-[10px] font-extrabold tracking-[0.08em] text-[var(--muted-foreground)]">
            TERBARU
          </span>
          <strong className="mt-1 block text-xl font-black text-[var(--blue)]">
            {latest.value.toFixed(decimals)} {unit}
          </strong>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="overflow-x-auto">
          <svg
            className="h-auto w-full text-[var(--blue)]"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            role="img"
            aria-label={`Grafik ${title.toLowerCase()}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#72B8E6" stopOpacity="0.3" />
                <stop offset="55%" stopColor="#FFB4D0" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#FFFDF7" stopOpacity="0" />
              </linearGradient>
              <linearGradient
                id={`${gradientId}-stroke`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#4E8BC4" />
                <stop offset="100%" stopColor="#B43E70" />
              </linearGradient>
            </defs>

            {horizontalGrid.map((line, index) => (
              <g key={index}>
                <line
                  x1={paddingLeft}
                  x2={chartWidth - paddingRight}
                  y1={line.y}
                  y2={line.y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray={index === 3 ? undefined : "4 6"}
                />
                <text
                  x={paddingLeft - 8}
                  y={line.y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="currentColor"
                  opacity="0.5"
                >
                  {line.value.toFixed(decimals)}
                </text>
              </g>
            ))}

            {referenceLines.map((line) => {
              const y = getY(line.value);
              return (
                <g key={line.label}>
                  <line
                    x1={paddingLeft}
                    x2={chartWidth - paddingRight}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.28"
                    strokeWidth="1.5"
                    strokeDasharray="7 6"
                  />
                  <rect
                    x={chartWidth - paddingRight - 63}
                    y={y - 18}
                    width="63"
                    height="17"
                    rx="7"
                    fill="white"
                    opacity="0.95"
                  />
                  <text
                    x={chartWidth - paddingRight - 6}
                    y={y - 6}
                    textAnchor="end"
                    fontSize="10"
                    fontWeight="700"
                    fill="currentColor"
                    opacity="0.72"
                  >
                    {line.label}
                  </text>
                </g>
              );
            })}

            {points.length > 1 && (
              <>
                <path
                  d={`M ${points[0].x} ${chartHeight - paddingBottom} L ${points
                    .map((point) => `${point.x} ${point.y}`)
                    .join(
                      " L ",
                    )} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} Z`}
                  fill={`url(#${gradientId})`}
                />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={`url(#${gradientId}-stroke)`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {points.map((point, index) => (
              <g key={`${point.date}-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="9"
                  fill="currentColor"
                  opacity="0.12"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="white"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <text
                  x={point.x}
                  y={point.y - 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="currentColor"
                >
                  {point.value.toFixed(decimals)}
                </text>
                <text
                  x={point.x}
                  y={chartHeight - paddingBottom + 24}
                  textAnchor="middle"
                  fontSize="10"
                  fill="currentColor"
                  opacity="0.62"
                >
                  {formatShortDate(point.date)}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {values.length === 1 && (
          <p className="portal-note mt-2 text-center">
            Grafik tren akan mulai terbentuk setelah terdapat minimal dua
            pemeriksaan.
          </p>
        )}
      </div>
    </article>
  );
}

export function ParentGrowthInsights({
  examinations,
  child,
}: {
  examinations: Examination[];
  child: ChildProfile | null;
}) {
  const series = displaySeries(examinations, child);
  const childExams = series.exams;
  const latest = childExams[0];

  if (!latest)
    return (
      <div className="portal-empty parent-insight-empty">
        <ChartNoAxesCombined />
        <h3>Belum ada data untuk divisualisasikan</h3>
        <p>Tambahkan profil anak usia 24–59 bulan untuk melihat contoh insight.</p>
      </div>
    );

  const previous = childExams[1];
  const heightChange = delta(latest.heightCm, previous?.heightCm ?? null);
  const weightChange = delta(latest.weightKg, previous?.weightKg ?? null);
  const trend = zTrend(latest, previous);
  const heightValues = metricValues(childExams, "heightCm");
  const weightValues = metricValues(childExams, "weightKg");
  const zValues = metricValues(childExams, "heightForAgeZ");

  return (
    <section className="mb-8 space-y-6">
      {series.demo && (
        <div className="parent-demo-banner">
          <strong>Mode demo grafik</strong>
          <span>
            Titik sebelum pemeriksaan asli adalah data simulasi tampilan dan tidak disimpan ke database.
          </span>
        </div>
      )}

      <div className="rounded-[1.75rem] border border-[var(--border)] bg-[linear-gradient(135deg,#f2f9ff_0%,#ffffff_58%,#fff5f8_100%)] p-6 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-extrabold tracking-[0.1em] text-[var(--blue)]">
              RINGKASAN PERKEMBANGAN
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
              {latest.childName}
            </h3>
            <p className="portal-note mt-2 max-w-2xl">
              Bandingkan hasil terbaru dengan pemeriksaan sebelumnya untuk
              melihat perkembangan anak dari waktu ke waktu.
            </p>
          </div>
          <span className="w-fit rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-extrabold text-[var(--muted-foreground)]">
            {series.demo
              ? "Visualisasi demo"
              : `${childExams.length} pemeriksaan tersimpan`}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <div className="flex items-center gap-2 text-[var(--blue)]">
              <Ruler size={18} />
              <span className="text-xs font-extrabold">TINGGI TERAKHIR</span>
            </div>
            <strong className="mt-3 block text-2xl font-black">
              {formatReading(latest.heightCm)} cm
            </strong>
            <p className="portal-note mt-1">
              {heightChange === null
                ? "Belum ada pembanding"
                : `${signed(heightChange)} cm dari sebelumnya`}
            </p>
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <div className="flex items-center gap-2 text-[var(--blue)]">
              <Scale size={18} />
              <span className="text-xs font-extrabold">BERAT TERAKHIR</span>
            </div>
            <strong className="mt-3 block text-2xl font-black">
              {formatReading(latest.weightKg)} kg
            </strong>
            <p className="portal-note mt-1">
              {weightChange === null
                ? "Belum ada pembanding"
                : `${signed(weightChange)} kg dari sebelumnya`}
            </p>
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <div className="flex items-center gap-2 text-[var(--blue)]">
              <ChartNoAxesCombined size={18} />
              <span className="text-xs font-extrabold">TB/U TERAKHIR</span>
            </div>
            <strong className="mt-3 block text-2xl font-black">
              {latest.heightForAgeZ === null
                ? "Belum tersedia"
                : `${latest.heightForAgeZ.toFixed(2)} SD`}
            </strong>
            <p className="portal-note mt-1">
              {growthStatusLabel(latest.growthStatus)}
            </p>
          </article>

          <article className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <div className="flex items-center gap-2 text-[var(--blue)]">
              <Activity size={18} />
              <span className="text-xs font-extrabold">
                PEMERIKSAAN TERAKHIR
              </span>
            </div>
            <strong className="mt-3 block text-lg font-black">
              {new Date(
                latest.completedAt || latest.createdAt,
              ).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
            <p className="portal-note mt-1">Data tersimpan di riwayat anak</p>
          </article>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <article className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">
              {trend.tone === "up" ? (
                <ArrowUpRight size={21} />
              ) : trend.tone === "down" ? (
                <ArrowDownRight size={21} />
              ) : (
                <ArrowRight size={21} />
              )}
            </span>
            <div>
              <p className="text-xs font-extrabold tracking-[0.08em] text-[var(--muted-foreground)]">
                TREN TB/U
              </p>
              <h3 className="mt-1 text-lg font-black">{trend.title}</h3>
              <p className="portal-note mt-2 leading-6">{trend.text}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs font-extrabold tracking-[0.08em] text-[var(--muted-foreground)]">
            CATATAN UNTUK ORANG TUA
          </p>
          <h3 className="mt-1 text-lg font-black">
            Perhatikan arah perkembangan dari beberapa pemeriksaan.
          </h3>
          <p className="portal-note mt-2 leading-6">
            Tinggi badan, berat badan, dan TB/U lebih bermanfaat jika
            dibandingkan dari beberapa pemeriksaan. Hasil StuntSpecula merupakan
            skrining pertumbuhan, bukan diagnosis medis.
          </p>
        </article>
      </div>

      <article className="parent-calibration-card">
        <div className="parent-calibration-copy">
          <span>KALIBRASI TB/U</span>
          <h3>{series.demo ? "Simulasi pembacaan pertumbuhan" : "Pembacaan terbaru"}</h3>
          <p>
            Usia {latest.ageMonths} bulan · TB {formatReading(latest.heightCm)} cm · BB{" "}
            {formatReading(latest.weightKg)} kg
          </p>
          <strong>{riskLabel(latest.growthStatus)}</strong>
          <small>
            TB/U {latest.heightForAgeZ === null ? "—" : `${latest.heightForAgeZ.toFixed(2)} SD`}. Berat badan ditampilkan sebagai konteks; status stunting utama mengikuti tinggi menurut umur WHO.
          </small>
        </div>
        <div className="parent-risk-scale" aria-label="Skala TB/U">
          <div className="parent-risk-gradient" />
          <span
            className="parent-risk-marker"
            style={{ left: `${zMarker(latest.heightForAgeZ)}%` }}
          />
          <div className="parent-risk-labels">
            <span>Berat</span>
            <span>Stunting</span>
            <span>Pantau</span>
            <span>Rentang</span>
          </div>
        </div>
      </article>

      <div>
        <div className="section-heading">
          <div>
            <h3>Grafik perkembangan</h3>
            <p className="portal-note">
              Menampilkan maksimal enam pemeriksaan terakhir agar perubahan
              mudah dibaca.
            </p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <GrowthLineChart
            title="Tinggi badan"
            description="Perubahan tinggi anak dari waktu ke waktu."
            unit="cm"
            values={heightValues}
            decimals={1}
          />
          <GrowthLineChart
            title="Berat badan"
            description="Perubahan berat anak dari setiap pemeriksaan."
            unit="kg"
            values={weightValues}
            decimals={1}
          />
          <div className="xl:col-span-2">
            <GrowthLineChart
              title="TB/U"
              description="Perubahan nilai Z-score tinggi badan menurut umur."
              unit="SD"
              values={zValues}
              decimals={2}
              referenceLines={[
                { value: -2, label: "-2 SD" },
                { value: -3, label: "-3 SD" },
              ]}
            />
          </div>
        </div>

        {heightValues.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3">
            <p className="portal-note">
              Data grafik: {formatMonth(heightValues[0].date)} —{" "}
              {formatMonth(heightValues[heightValues.length - 1].date)}
            </p>
            <span className="text-xs font-bold text-[var(--muted-foreground)]">
              Maks. {MAX_POINTS} pemeriksaan
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
