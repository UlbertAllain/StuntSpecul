"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CircleAlert,
  CircleCheckBig,
  RefreshCw,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Message } from "../shared/shell";

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
  ageBands: { "24-35": number; "36-47": number; "48-59": number };
  attention: { currentRisk: number; previousRisk: number; change: number };
};

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function DistributionRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const share = percent(value, total);
  return (
    <div className="simple-distribution-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="simple-progress">
        <i style={{ width: `${share}%` }} />
      </div>
      <small>{share}%</small>
    </div>
  );
}

export function InsightsPanel() {
  const [data, setData] = useState<InsightResponse | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);

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
  }, [revision]);

  const growthTotal = data
    ? data.growth.normal +
      data.growth.watch +
      data.growth.stunted +
      data.growth.severe +
      data.growth.unavailable
    : 0;
  const ageTotal = data
    ? data.ageBands["24-35"] + data.ageBands["36-47"] + data.ageBands["48-59"]
    : 0;

  return (
    <>
      <div className="section-heading compact-section-heading">
        <div>
          <h2>Insight</h2>
          <p className="portal-note">
            Ringkasan 30 hari dalam format singkat dan mudah dibaca.
          </p>
        </div>
        <button
          className="portal-text"
          disabled={refreshing}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={17} /> {refreshing ? "Memuat…" : "Perbarui"}
        </button>
      </div>

      {error && <Message error>{error}</Message>}
      {!data && !error && <Message>Menyiapkan insight…</Message>}

      {data && (
        <>
          <div className="simple-stat-grid">
            <article>
              <span className="simple-stat-icon blue">
                <Activity />
              </span>
              <strong>{data.activity.examinations}</strong>
              <p>Pemeriksaan</p>
            </article>
            <article>
              <span className="simple-stat-icon green">
                <CircleCheckBig />
              </span>
              <strong>{data.activity.completed}</strong>
              <p>Selesai</p>
            </article>
            <article>
              <span className="simple-stat-icon pink">
                <CircleAlert />
              </span>
              <strong>{data.attention.currentRisk}</strong>
              <p>Perlu perhatian</p>
            </article>
            <article>
              <span className="simple-stat-icon blue">
                <UsersRound />
              </span>
              <strong>{data.activity.activeParents}</strong>
              <p>Orang tua aktif</p>
            </article>
          </div>
          <section className="portal-card simple-insight-card">
            <div className="simple-card-title">
              <TrendingUp size={19} />
              <div>
                <h3>Hasil TB/U WHO</h3>
                <p>Distribusi hasil pemeriksaan selesai.</p>
              </div>
            </div>
            <DistributionRow
              label="Tidak terindikasi"
              value={data.growth.normal}
              total={growthTotal}
            />
            <DistributionRow
              label="Perlu dipantau"
              value={data.growth.watch}
              total={growthTotal}
            />
            <DistributionRow
              label="Indikasi stunting"
              value={data.growth.stunted}
              total={growthTotal}
            />
            <DistributionRow
              label="Indikasi stunting berat"
              value={data.growth.severe}
              total={growthTotal}
            />
          </section>
          <section className="portal-card simple-insight-card">
            <div className="simple-card-title">
              <UsersRound size={19} />
              <div>
                <h3>Kelompok usia</h3>
                <p>Jumlah pemeriksaan berdasarkan usia.</p>
              </div>
            </div>
            <DistributionRow
              label="24–35 bulan"
              value={data.ageBands["24-35"]}
              total={ageTotal}
            />
            <DistributionRow
              label="36–47 bulan"
              value={data.ageBands["36-47"]}
              total={ageTotal}
            />
            <DistributionRow
              label="48–59 bulan"
              value={data.ageBands["48-59"]}
              total={ageTotal}
            />
          </section>
        </>
      )}
    </>
  );
}
