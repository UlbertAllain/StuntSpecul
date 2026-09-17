"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  CircleAlert,
  RefreshCw,
  ShieldCheck,
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

function StatCard({
  label,
  value,
  icon: Icon,
  note,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  note?: string;
}) {
  return (
    <article className="portal-card !mb-0">
      <Icon size={22} className="text-[var(--blue)]" />
      <p className="portal-note">{label}</p>
      <strong className="mt-2 block text-3xl font-black">{value}</strong>
      {note && <small className="mt-2 block text-[var(--muted-foreground)]">{note}</small>}
    </article>
  );
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0;
  return (
    <div className="py-2">
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="font-bold">{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#edf3f8]">
        <div
          className="h-full rounded-full bg-[var(--blue)] transition-[width]"
          style={{ width: `${width}%` }}
        />
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
    ? data.ageBands["24-35"] +
      data.ageBands["36-47"] +
      data.ageBands["48-59"]
    : 0;

  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Insight fasilitas</h2>
          <p className="portal-note">
            Ringkasan 30 hari terakhir untuk membantu pengelola melihat pola
            pemeriksaan dan anak yang perlu perhatian lebih lanjut.
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Pemeriksaan 30 hari"
              value={data.activity.examinations}
              icon={Activity}
              note={`${data.activity.previousExaminations} pada 30 hari sebelumnya`}
            />
            <StatCard
              label="Pemeriksaan selesai"
              value={data.activity.completed}
              icon={ShieldCheck}
            />
            <StatCard
              label="Akun orang tua aktif"
              value={data.activity.activeParents}
              icon={UsersRound}
            />
            <StatCard
              label="Perlu perhatian"
              value={data.attention.currentRisk}
              icon={CircleAlert}
              note={
                data.attention.change === 0
                  ? "Sama dengan periode sebelumnya"
                  : `${Math.abs(data.attention.change)} ${data.attention.change > 0 ? "lebih banyak" : "lebih sedikit"} dari periode sebelumnya`
              }
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="portal-card !mb-0">
              <h3>
                <ChartNoAxesCombined /> Hasil skrining TB/U
              </h3>
              <p className="portal-note !mt-0">
                Berdasarkan pemeriksaan selesai selama 30 hari terakhir.
              </p>
              <div className="mt-4">
                <Bar label="Tidak terindikasi" value={data.growth.normal} total={totalGrowth} />
                <Bar label="Perlu dipantau" value={data.growth.watch} total={totalGrowth} />
                <Bar label="Indikasi stunting" value={data.growth.stunted} total={totalGrowth} />
                <Bar label="Indikasi stunting berat" value={data.growth.severe} total={totalGrowth} />
                {data.growth.unavailable > 0 && (
                  <Bar label="Data belum lengkap" value={data.growth.unavailable} total={totalGrowth} />
                )}
              </div>
            </section>

            <section className="portal-card !mb-0">
              <h3>
                <UsersRound /> Kelompok usia pemeriksaan
              </h3>
              <p className="portal-note !mt-0">
                Distribusi pemeriksaan selesai berdasarkan usia anak.
              </p>
              <div className="mt-4">
                <Bar label="24–35 bulan" value={data.ageBands["24-35"]} total={totalAge} />
                <Bar label="36–47 bulan" value={data.ageBands["36-47"]} total={totalAge} />
                <Bar label="48–59 bulan" value={data.ageBands["48-59"]} total={totalAge} />
              </div>
            </section>
          </div>

          <section className="portal-card mt-6">
            <h3>
              <CircleAlert /> Catatan tindak lanjut
            </h3>
            <p>
              Terdapat <strong>{data.attention.currentRisk}</strong> hasil dalam
              30 hari terakhir yang masuk kategori indikasi stunting atau
              indikasi stunting berat. Angka ini merupakan hasil skrining dan
              perlu ditindaklanjuti sesuai prosedur fasilitas kesehatan.
            </p>
            <p className="portal-note">
              Insight ini tidak menggantikan penilaian tenaga kesehatan dan tidak
              digunakan sebagai diagnosis otomatis.
            </p>
          </section>
        </>
      )}
    </>
  );
}
