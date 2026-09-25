"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Ruler,
  Scale,
} from "lucide-react";

import { growthStatusLabel } from "@/lib/growth";
import type { ChildProfile, Examination } from "@/lib/portal";
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

type MetricOption = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  decimals: number;
  description: string;
  referenceLines?: ReferenceLine[];
};

const METRICS: MetricOption[] = [
  {
    key: "heightCm",
    label: "Tinggi badan",
    shortLabel: "Tinggi",
    unit: "cm",
    decimals: 1,
    description: "Perubahan tinggi dari beberapa pemeriksaan terakhir.",
  },
  {
    key: "weightKg",
    label: "Berat badan",
    shortLabel: "Berat",
    unit: "kg",
    decimals: 1,
    description: "Perubahan berat dari beberapa pemeriksaan terakhir.",
  },
  {
    key: "heightForAgeZ",
    label: "TB/U WHO",
    shortLabel: "TB/U",
    unit: "SD",
    decimals: 2,
    description: "Perubahan Z-score tinggi badan menurut umur.",
    referenceLines: [
      { value: -2, label: "-2 SD" },
      { value: -3, label: "-3 SD" },
    ],
  },
];

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
      text: "Minimal dua pemeriksaan diperlukan untuk membandingkan perubahan TB/U.",
    };
  }

  const change = latest.heightForAgeZ - previous.heightForAgeZ;

  if (change > 0) {
    return {
      tone: "up" as TrendTone,
      title: "TB/U meningkat dari pemeriksaan sebelumnya",
      text: `Perubahan tercatat ${signed(change, 2)} SD.`,
    };
  }

  if (change < 0) {
    return {
      tone: "down" as TrendTone,
      title: "TB/U menurun dari pemeriksaan sebelumnya",
      text: `Perubahan tercatat ${signed(change, 2)} SD. Pantau pemeriksaan berikutnya.`,
    };
  }

  return {
    tone: "stable" as TrendTone,
    title: "TB/U sama dengan pemeriksaan sebelumnya",
    text: "Belum ada perubahan nilai TB/U.",
  };
}

function formatShortDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function GrowthLineChart({
  option,
  values,
}: {
  option: MetricOption;
  values: ChartPoint[];
}) {
  if (values.length === 0) {
    return (
      <div className="parent-insight-chart-empty">
        <ChartNoAxesCombined size={28} />
        <strong>Belum ada data {option.shortLabel.toLowerCase()}</strong>
        <p>Data akan muncul setelah pemeriksaan tersimpan.</p>
      </div>
    );
  }

  const chartWidth = 520;
  const chartHeight = 220;
  const paddingLeft = 42;
  const paddingRight = 18;
  const paddingTop = 28;
  const paddingBottom = 44;
  const allValues = [
    ...values.map((item) => item.value),
    ...(option.referenceLines || []).map((line) => line.value),
  ];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const rawRange = rawMax - rawMin;
  const extraRange = Math.max(
    rawRange * 0.2,
    Math.abs(rawMax || rawMin || 1) * 0.05,
    option.unit === "SD" ? 0.4 : 0.5,
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
  const gradientId = `parent-insight-${option.key}`;
  const horizontalGrid = Array.from({ length: 4 }).map((_, index) => {
    const ratio = index / 3;
    return {
      y: paddingTop + ratio * plotHeight,
      value: max - ratio * range,
    };
  });

  return (
    <div className="parent-insight-chart-wrap">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={`Grafik ${option.label.toLowerCase()}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#72B8E6" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#FFB4D0" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FFFDF7" stopOpacity="0" />
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
              strokeDasharray="4 6"
            />
            <text
              x={paddingLeft - 8}
              y={line.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="currentColor"
              opacity="0.5"
            >
              {line.value.toFixed(option.decimals)}
            </text>
          </g>
        ))}

        {(option.referenceLines || []).map((line) => {
          const y = getY(line.value);
          return (
            <g key={line.label}>
              <line
                x1={paddingLeft}
                x2={chartWidth - paddingRight}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="1.4"
                strokeDasharray="7 6"
              />
              <text
                x={chartWidth - paddingRight - 4}
                y={y - 7}
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
              stroke="currentColor"
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
              r="5"
              fill="white"
              stroke="currentColor"
              strokeWidth="3"
            />
            <text
              x={point.x}
              y={point.y - 13}
              textAnchor="middle"
              fontSize="10"
              fontWeight="800"
              fill="currentColor"
            >
              {point.value.toFixed(option.decimals)}
            </text>
            <text
              x={point.x}
              y={chartHeight - paddingBottom + 23}
              textAnchor="middle"
              fontSize="9"
              fill="currentColor"
              opacity="0.62"
            >
              {formatShortDate(point.date)}
            </text>
          </g>
        ))}
      </svg>

      {values.length === 1 && (
        <p>Tambahkan satu pemeriksaan lagi untuk membentuk tren.</p>
      )}
    </div>
  );
}

export function ParentGrowthInsights({
  examinations,
}: {
  examinations: Examination[];
  child: ChildProfile | null;
}) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("heightCm");
  const childExams = sameChildExams(examinations);
  const latest = childExams[0];

  if (!latest) {
    return (
      <div className="portal-empty parent-insight-empty">
        <ChartNoAxesCombined />
        <h3>Belum ada data untuk divisualisasikan</h3>
        <p>
          Insight akan tampil setelah anak memiliki hasil pemeriksaan pertama.
        </p>
      </div>
    );
  }

  const previous = childExams[1];
  const heightChange = delta(latest.heightCm, previous?.heightCm ?? null);
  const weightChange = delta(latest.weightKg, previous?.weightKg ?? null);
  const trend = zTrend(latest, previous);
  const activeOption =
    METRICS.find((option) => option.key === activeMetric) || METRICS[0];
  const activeValues = metricValues(childExams, activeOption.key);

  return (
    <section className="parent-growth-insight">
      <div className="parent-insight-latest">
        <div className="parent-insight-latest-head">
          <div>
            <span>HASIL TERBARU</span>
            <h3>{latest.childName}</h3>
          </div>
          <small>{childExams.length} pemeriksaan tersimpan</small>
        </div>

        <div className="parent-insight-summary-grid">
          <article>
            <Ruler size={17} />
            <span>Tinggi</span>
            <strong>{formatReading(latest.heightCm)} cm</strong>
            <small>
              {heightChange === null
                ? "Belum ada pembanding"
                : `${signed(heightChange)} cm`}
            </small>
          </article>

          <article>
            <Scale size={17} />
            <span>Berat</span>
            <strong>{formatReading(latest.weightKg)} kg</strong>
            <small>
              {weightChange === null
                ? "Belum ada pembanding"
                : `${signed(weightChange)} kg`}
            </small>
          </article>

          <article>
            <ChartNoAxesCombined size={17} />
            <span>TB/U</span>
            <strong>
              {latest.heightForAgeZ === null
                ? "—"
                : `${latest.heightForAgeZ.toFixed(2)} SD`}
            </strong>
            <small>{growthStatusLabel(latest.growthStatus)}</small>
          </article>
        </div>
      </div>

      <section className="parent-insight-chart-card">
        <div className="parent-insight-chart-head">
          <div>
            <span>GRAFIK PERKEMBANGAN</span>
            <h3>{activeOption.label}</h3>
            <p>{activeOption.description}</p>
          </div>
          {activeValues.length > 0 && (
            <strong>
              {activeValues.at(-1)!.value.toFixed(activeOption.decimals)}{" "}
              {activeOption.unit}
            </strong>
          )}
        </div>

        <div
          className="parent-insight-tabs"
          role="tablist"
          aria-label="Pilih grafik"
        >
          {METRICS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={activeMetric === option.key}
              onClick={() => setActiveMetric(option.key)}
            >
              {option.shortLabel}
            </button>
          ))}
        </div>

        <GrowthLineChart option={activeOption} values={activeValues} />
      </section>

      <div className="parent-insight-bottom-grid">
        <article className="parent-insight-trend-card">
          <span className="parent-insight-trend-icon">
            {trend.tone === "up" ? (
              <ArrowUpRight size={21} />
            ) : trend.tone === "down" ? (
              <ArrowDownRight size={21} />
            ) : (
              <ArrowRight size={21} />
            )}
          </span>
          <div>
            <small>TREN TB/U</small>
            <strong>{trend.title}</strong>
            <p>{trend.text}</p>
          </div>
        </article>

        <article className="parent-insight-who-card">
          <small>STATUS WHO TERBARU</small>
          <strong>{growthStatusLabel(latest.growthStatus)}</strong>
          <dl>
            <div>
              <dt>TB/U Z-score</dt>
              <dd>
                {latest.heightForAgeZ === null
                  ? "Belum tersedia"
                  : `${latest.heightForAgeZ.toFixed(2)} SD`}
              </dd>
            </div>
            <div>
              <dt>Pemeriksaan</dt>
              <dd>
                {new Date(
                  latest.completedAt || latest.createdAt,
                ).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
          <p>
            Lihat detail pemeriksaan di Riwayat untuk dasar hasil dan langkah
            selanjutnya.
          </p>
        </article>
      </div>
    </section>
  );
}
