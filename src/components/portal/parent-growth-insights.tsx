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
import type { Examination } from "@/lib/portal";
import { formatReading } from "@/lib/screening";
import { growthStatusLabel } from "@/lib/growth";

const MAX_POINTS = 6;

type MetricKey = "heightCm" | "weightKg" | "heightForAgeZ";

type TrendTone = "up" | "stable" | "down" | "unavailable";

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

function metricValues(examinations: Examination[], key: MetricKey) {
  return chronological(examinations)
    .map((exam) => ({
      value: exam[key],
      date: exam.completedAt || exam.createdAt,
    }))
    .filter((item): item is { value: number; date: number } =>
      Number.isFinite(item.value),
    );
}

function delta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return current - previous;
}

function signed(value: number, digits = 1) {
  const rounded = value.toFixed(digits);
  return value > 0 ? `+${rounded}` : rounded;
}

function zTrend(latest: Examination, previous: Examination | undefined) {
  if (
    latest.heightForAgeZ === null ||
    previous?.heightForAgeZ === null ||
    !previous
  )
    return {
      tone: "unavailable" as TrendTone,
      title: "Belum cukup data untuk membaca tren",
      text: "Tambahkan pemeriksaan berikutnya untuk membandingkan perkembangan TB/U.",
    };

  const change = latest.heightForAgeZ - previous.heightForAgeZ;
  if (change > 0)
    return {
      tone: "up" as TrendTone,
      title: "Nilai TB/U meningkat dari pemeriksaan sebelumnya",
      text: `Perubahan tercatat ${signed(change, 2)} SD. Lihat bersama status skrining terbaru untuk memahami hasilnya.`,
    };
  if (change < 0)
    return {
      tone: "down" as TrendTone,
      title: "Nilai TB/U menurun dari pemeriksaan sebelumnya",
      text: `Perubahan tercatat ${signed(change, 2)} SD. Lihat bersama status skrining terbaru dan ikuti arahan petugas kesehatan bila diperlukan.`,
    };
  return {
    tone: "stable" as TrendTone,
    title: "Nilai TB/U sama dengan pemeriksaan sebelumnya",
    text: "Belum ada perubahan nilai TB/U dibanding pemeriksaan sebelumnya.",
  };
}

function MiniLineChart({
  title,
  unit,
  values,
  decimals = 1,
}: {
  title: string;
  unit: string;
  values: { value: number; date: number }[];
  decimals?: number;
}) {
  if (values.length === 0) {
    return (
      <article className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <h3 className="text-base font-black">{title}</h3>
        <p className="portal-note mt-2">
          Belum ada data yang dapat digambarkan.
        </p>
      </article>
    );
  }

  const width = 360;
  const height = 150;
  const paddingX = 18;
  const paddingY = 22;
  const rawMin = Math.min(...values.map((item) => item.value));
  const rawMax = Math.max(...values.map((item) => item.value));
  const spread = Math.max(rawMax - rawMin, Math.abs(rawMax || 1) * 0.04, 0.1);
  const min = rawMin - spread * 0.25;
  const max = rawMax + spread * 0.25;
  const range = Math.max(max - min, 0.1);
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const points = values.map((item, index) => {
    const x =
      values.length === 1
        ? width / 2
        : paddingX + (index / (values.length - 1)) * plotWidth;
    const y = paddingY + ((max - item.value) / range) * plotHeight;
    return { ...item, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const latest = values.at(-1)!;

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black">{title}</h3>
          <p className="portal-note mt-1">
            {values.length} pemeriksaan terakhir
          </p>
        </div>
        <strong className="text-lg font-black text-[var(--foreground)]">
          {latest.value.toFixed(decimals)} {unit}
        </strong>
      </div>
      <svg
        className="mt-4 h-36 w-full overflow-visible text-[var(--blue)]"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Grafik ${title.toLowerCase()}`}
      >
        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={height - paddingY}
          y2={height - paddingY}
          stroke="currentColor"
          strokeOpacity="0.12"
        />
        {points.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] font-bold text-[var(--muted-foreground)]">
        <span>
          {new Date(values[0].date).toLocaleDateString("id-ID", {
            month: "short",
            year: "2-digit",
          })}
        </span>
        <span>
          {new Date(latest.date).toLocaleDateString("id-ID", {
            month: "short",
            year: "2-digit",
          })}
        </span>
      </div>
    </article>
  );
}

export function ParentGrowthInsights({
  examinations,
}: {
  examinations: Examination[];
}) {
  const childExams = sameChildExams(examinations);
  const latest = childExams[0];
  if (!latest) return null;

  const previous = childExams[1];
  const heightChange = delta(latest.heightCm, previous?.heightCm ?? null);
  const weightChange = delta(latest.weightKg, previous?.weightKg ?? null);
  const trend = zTrend(latest, previous);
  const heightValues = metricValues(childExams, "heightCm");
  const weightValues = metricValues(childExams, "weightKg");
  const zValues = metricValues(childExams, "heightForAgeZ");

  return (
    <section className="mb-8 space-y-5">
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
              Ringkasan ini membandingkan hasil pemeriksaan terbaru dengan data
              sebelumnya dari anak yang sama.
            </p>
          </div>
          <span className="w-fit rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-extrabold text-[var(--muted-foreground)]">
            {childExams.length} pemeriksaan tersimpan
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
                : `${signed(heightChange)} cm dari pemeriksaan sebelumnya`}
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
                : `${signed(weightChange)} kg dari pemeriksaan sebelumnya`}
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
            Lihat arah perubahan, bukan satu angka saja.
          </h3>
          <p className="portal-note mt-2 leading-6">
            Tinggi, berat, dan TB/U lebih bermanfaat jika dipantau dari beberapa
            pemeriksaan. Hasil di halaman ini merupakan skrining pertumbuhan,
            bukan diagnosis medis.
          </p>
        </article>
      </div>

      <div>
        <div className="section-heading">
          <div>
            <h3>Grafik perkembangan</h3>
            <p className="portal-note">
              Maksimal enam pemeriksaan terakhir ditampilkan agar tren mudah
              dibaca.
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <MiniLineChart title="Tinggi badan" unit="cm" values={heightValues} />
          <MiniLineChart title="Berat badan" unit="kg" values={weightValues} />
          <MiniLineChart title="TB/U" unit="SD" values={zValues} decimals={2} />
        </div>
      </div>
    </section>
  );
}
