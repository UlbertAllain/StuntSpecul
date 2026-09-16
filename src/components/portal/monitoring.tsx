"use client";

import { useEffect, useState } from "react";
import { Activity, Baby, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { MonitoringOverview } from "@/lib/portal";
import { formatAge, formatReading } from "@/lib/screening";
import { Message } from "./shell";

const SESSION_LABEL = {
  waiting_parent: "Menunggu orang tua",
  parent_connected: "Orang tua sedang mengisi data",
  ready: "Siap diperiksa",
  running: "Sedang diperiksa",
};

const EXAM_LABEL = {
  queued: "Menunggu mulai",
  running: "Sedang diperiksa",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function MonitoringPanel() {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [since] = useState(() => startOfToday());

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function load(silent = false) {
      if (!silent) setRefreshing(true);
      try {
        const value = await api<MonitoringOverview>(
          `/monitoring?since=${since}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setOverview(value);
        setError("");
      } catch (e) {
        if (!controller.signal.aborted) setError(errorMessage(e));
      } finally {
        if (!controller.signal.aborted) {
          setRefreshing(false);
          timer = setTimeout(() => void load(true), 5000);
        }
      }
    }

    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [since]);

  if (!overview && !error) return <Message>Memuat data monitoring…</Message>;

  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Monitoring pemeriksaan</h2>
          <p className="portal-note">
            Data diperbarui otomatis selama dashboard dibuka.
          </p>
        </div>
        <button
          className="portal-text"
          disabled={refreshing}
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={17} />
          {refreshing ? "Memperbarui…" : "Perbarui"}
        </button>
      </div>

      {error && <Message error>{error}</Message>}

      {overview && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="portal-card !mb-0">
              <Baby size={22} />
              <p className="portal-note">Anak tercatat</p>
              <strong className="mt-2 block text-3xl font-black">
                {overview.stats.totalChildren}
              </strong>
            </article>
            <article className="portal-card !mb-0">
              <Clock3 size={22} />
              <p className="portal-note">Pemeriksaan hari ini</p>
              <strong className="mt-2 block text-3xl font-black">
                {overview.stats.todayExaminations}
              </strong>
            </article>
            <article className="portal-card !mb-0">
              <CheckCircle2 size={22} />
              <p className="portal-note">Selesai hari ini</p>
              <strong className="mt-2 block text-3xl font-black">
                {overview.stats.todayCompleted}
              </strong>
            </article>
            <article className="portal-card !mb-0">
              <Activity size={22} />
              <p className="portal-note">Sesi aktif</p>
              <strong className="mt-2 block text-3xl font-black">
                {overview.stats.activeSessions}
              </strong>
            </article>
          </div>

          <section className="portal-card mt-6">
            <h3>
              <Activity /> Pemeriksaan aktif
            </h3>
            {overview.active.length === 0 ? (
              <div className="portal-empty">
                <h3>Tidak ada pemeriksaan aktif</h3>
                <p>Alat siap menerima pemeriksaan berikutnya.</p>
              </div>
            ) : (
              <div className="examination-list">
                {overview.active.map((item) => (
                  <div className="examination-row" key={item.id}>
                    <span>
                      <strong>
                        {item.childName || "Sesi pemeriksaan sementara"}
                      </strong>
                      <small>
                        {item.ageMonths === null
                          ? "Menunggu data sesi"
                          : formatAge(item.ageMonths)}
                      </small>
                    </span>
                    <span
                      className={`status-label status-${item.examStatus || "queued"}`}
                    >
                      {SESSION_LABEL[item.status]}
                    </span>
                    <span className="row-readings">
                      {new Date(item.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="portal-card">
            <h3>
              <Clock3 /> Pemeriksaan terbaru
            </h3>
            {overview.recent.length === 0 ? (
              <div className="portal-empty">
                <h3>Belum ada riwayat pemeriksaan</h3>
                <p>
                  Data akan muncul setelah petugas memilih anak dan pemeriksaan
                  dijalankan melalui alat StuntSpecula.
                </p>
              </div>
            ) : (
              <div className="examination-list">
                {overview.recent.map((item) => (
                  <div className="examination-row" key={item.id}>
                    <span>
                      <strong>{item.childName}</strong>
                      <small>
                        {formatAge(item.ageMonths)} ·{" "}
                        {new Date(item.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </small>
                    </span>
                    <span className={`status-label status-${item.status}`}>
                      {EXAM_LABEL[item.status]}
                    </span>
                    <span className="row-readings">
                      {formatReading(item.heightCm)} cm /{" "}
                      {formatReading(item.weightKg)} kg
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
