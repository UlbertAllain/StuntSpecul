"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  CircleAlert,
  CircleCheckBig,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Message } from "./shell";

type InsightResponse = {
  periodDays: number;
  activity: {
    examinations: number;
    completed: number;
    previousExaminations: number;
    activeParents: number;
  };
  growth: {
    normal: number;
    watch: number;
    stunted: number;
    severe: number;
    unavailable: number;
  };
  ageBands: {
    "24-35": number;
    "36-47": number;
    "48-59": number;
  };
  attention: {
    currentRisk: number;
    previousRisk: number;
    change: number;
  };
};

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function StatCard({
  label,
  value,
  icon: Icon,
  note,
  emphasis = false,
}: {
  label: string;
  value: number | string;
  icon: typeof Activity;
  note?: string;
  emphasis?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.5rem] border p-5 shadow-sm ${
        emphasis
          ? "border-[#ead8df] bg-[linear-gradient(145deg,#fff8fa_0%,#ffffff_100%)]"
          : "border-[var(--border)] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${
            emphasis
              ? "bg-[#fce8ef] text-[#b84d75]"
              : "bg-[#eaf5fc] text-[var(--blue)]"
          }`}
        >
          <Icon size={20} />
        </span>
        <span className="text-[11px] font-extrabold tracking-[0.08em] text-[var(--muted-foreground)]">
          30 HARI
        </span>
      </div>
      <strong className="mt-5 block text-3xl font-black tracking-[-0.04em]">
        {value}
      </strong>
      <span className="mt-1 block text-sm font-extrabold">{label}</span>
      {note && (
        <small className="mt-2 block leading-5 text-[var(--muted-foreground)]">
          {note}
        </small>
      )}
    </article>
  );
}

function Bar({
  label,
  value,
  total,
  note,
}: {
  label: string;
  value: number;
  total: number;
  note?: string;
}) {
  const share = percentage(value, total);
  return (
    <div className="py-3">
      <div className="mb-2 flex items-end justify-between gap-4">
        <div>
          <span className="block text-sm font-extrabold">{label}</span>
          {note && (
            <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
              {note}
            </span>
          )}
        </div>
        <div className="text-right">
          <strong className="block text-sm">{value}</strong>
          <span className="text-[11px] font-bold text-[var(--muted-foreground)]">
            {share}%
          </span>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#edf3f8]">
        <div
          className="h-full rounded-full bg-[var(--blue)] transition-[width]"
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}

function Donut({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full bg-[#edf3f7]">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#3475aa ${safe * 3.6}deg, #edf3f7 0deg)`,
        }}
      />
      <div className="relative grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-sm">
        <div>
          <strong className="block text-2xl font-black">{safe}%</strong>
          <span className="text-[10px] font-bold leading-4 text-[var(--muted-foreground)]">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

export function InsightsPanel() {
  const [data, setData] = useState<InsightResponse | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setRefreshing(true);
      try {
        const value = await api<InsightResponse>("/insights", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setData(value);
          setError("");
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      } finally {
        if (!controller.signal.aborted) setRefreshing(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey]);

  const totalGrowth = data
    ? data.growth.normal +
      data.growth.watch +
      data.growth.stunted +
      data.growth.severe +
      data.growth.unavailable
    : 0;
  const totalAge = data
    ? data.ageBands["24-35"] + data.ageBands["36-47"] + data.ageBands["48-59"]
    : 0;
  const completionRate = data
    ? percentage(data.activity.completed, data.activity.examinations)
    : 0;
  const attentionRate = data
    ? percentage(data.attention.currentRisk, totalGrowth)
    : 0;
  const activityChange = data
    ? data.activity.examinations - data.activity.previousExaminations
    : 0;

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="mb-2 text-xs font-extrabold tracking-[0.11em] text-[var(--blue)]">
            RINGKASAN PENGELOLA
          </p>
          <h2>Insight fasilitas</h2>
          <p className="portal-note max-w-3xl">
            Gambaran 30 hari terakhir untuk membaca aktivitas pemeriksaan,
            distribusi hasil skrining, dan area yang membutuhkan perhatian.
          </p>
        </div>
        <button
          className="portal-text"
          disabled={refreshing}
          onClick={() => setRefreshKey((value) => value + 1)}
        >
          <RefreshCw size={17} />
          {refreshing ? "Memperbarui…" : "Perbarui"}
        </button>
      </div>

      {error && <Message error>{error}</Message>}
      {!data && !error && <Message>Menyiapkan insight…</Message>}

      {data && (
        <>
          <section className="mb-6 overflow-hidden rounded-[1.75rem] border border-[#d9e6ef] bg-[linear-gradient(135deg,#17324d_0%,#254d6d_100%)] text-white shadow-[0_20px_60px_rgba(23,50,77,.14)]">
            <div className="grid gap-7 p-6 md:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-[#bcd8ea]">
                  <TrendingUp size={18} />
                  <span className="text-xs font-extrabold tracking-[0.1em]">
                    AKTIVITAS 30 HARI
                  </span>
                </div>
                <strong className="mt-4 block text-4xl font-black tracking-[-0.045em] md:text-5xl">
                  {data.activity.examinations} pemeriksaan
                </strong>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 font-bold">
                    {activityChange >= 0 ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <ArrowDownRight size={16} />
                    )}
                    {Math.abs(activityChange)} dibanding periode sebelumnya
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 font-bold">
                    <CircleCheckBig size={16} /> {completionRate}% selesai
                  </span>
                </div>
              </div>
              <Donut value={completionRate} label="SELESAI" />
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Pemeriksaan selesai"
              value={data.activity.completed}
              icon={ShieldCheck}
              note={`${data.activity.examinations - data.activity.completed} belum selesai atau dibatalkan`}
            />
            <StatCard
              label="Akun orang tua aktif"
              value={data.activity.activeParents}
              icon={UsersRound}
              note="Akun yang tersedia untuk monitoring keluarga"
            />
            <StatCard
              label="Perlu perhatian"
              value={data.attention.currentRisk}
              icon={CircleAlert}
              emphasis
              note={`${attentionRate}% dari hasil skrining yang tersedia`}
            />
            <StatCard
              label="Perubahan perhatian"
              value={
                data.attention.change === 0
                  ? "Tetap"
                  : `${data.attention.change > 0 ? "+" : ""}${data.attention.change}`
              }
              icon={ChartNoAxesCombined}
              note={`${data.attention.previousRisk} pada periode sebelumnya`}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-[1.75rem] border border-[var(--border)] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="!mb-1">
                    <ChartNoAxesCombined /> Hasil skrining TB/U
                  </h3>
                  <p className="portal-note !mt-0">
                    Distribusi dari pemeriksaan selesai selama 30 hari terakhir.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f3f8fb] px-4 py-3 text-right">
                  <span className="block text-[11px] font-extrabold text-[var(--muted-foreground)]">
                    HASIL TERSEDIA
                  </span>
                  <strong className="text-xl">{totalGrowth}</strong>
                </div>
              </div>
              <div className="mt-5 grid gap-x-8 md:grid-cols-2">
                <Bar
                  label="Tidak terindikasi"
                  value={data.growth.normal}
                  total={totalGrowth}
                  note="TB/U dalam rentang pemantauan"
                />
                <Bar
                  label="Perlu dipantau"
                  value={data.growth.watch}
                  total={totalGrowth}
                  note="Belum stunting, perlu monitoring"
                />
                <Bar
                  label="Indikasi stunting"
                  value={data.growth.stunted}
                  total={totalGrowth}
                />
                <Bar
                  label="Indikasi stunting berat"
                  value={data.growth.severe}
                  total={totalGrowth}
                />
                {data.growth.unavailable > 0 && (
                  <Bar
                    label="Data belum lengkap"
                    value={data.growth.unavailable}
                    total={totalGrowth}
                  />
                )}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-[var(--border)] bg-white p-6 shadow-sm">
              <h3 className="!mb-1">
                <UsersRound /> Kelompok usia
              </h3>
              <p className="portal-note !mt-0">
                Sebaran usia anak pada pemeriksaan selesai.
              </p>
              <div className="mt-5">
                <Bar
                  label="24–35 bulan"
                  value={data.ageBands["24-35"]}
                  total={totalAge}
                />
                <Bar
                  label="36–47 bulan"
                  value={data.ageBands["36-47"]}
                  total={totalAge}
                />
                <Bar
                  label="48–59 bulan"
                  value={data.ageBands["48-59"]}
                  total={totalAge}
                />
              </div>
              <div className="mt-5 rounded-2xl bg-[#f7fafc] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
                Total <strong className="text-[var(--foreground)]">{totalAge}</strong>{" "}
                pemeriksaan selesai masuk dalam rentang usia alat StuntSpecula.
              </div>
            </section>
          </div>

          <section className="mt-6 grid gap-5 rounded-[1.75rem] border border-[#eadbe1] bg-[linear-gradient(135deg,#fff9fb_0%,#ffffff_100%)] p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fce8ef] text-[#b84d75]">
              <CircleAlert size={24} />
            </span>
            <div>
              <h3 className="!mb-1">Prioritas tindak lanjut</h3>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                Terdapat <strong>{data.attention.currentRisk}</strong> hasil yang
                masuk kategori indikasi stunting atau indikasi stunting berat dalam
                30 hari terakhir. Gunakan angka ini sebagai daftar perhatian untuk
                tindak lanjut tenaga kesehatan, bukan sebagai diagnosis otomatis.
              </p>
            </div>
            <div className="rounded-2xl border border-[#ecdce3] bg-white px-5 py-4 text-center shadow-sm">
              <strong className="block text-2xl font-black">{attentionRate}%</strong>
              <span className="text-[11px] font-extrabold text-[var(--muted-foreground)]">
                PROPORSI PERHATIAN
              </span>
            </div>
          </section>
        </>
      )}
    </>
  );
}
