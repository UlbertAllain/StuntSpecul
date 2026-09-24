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
  awaiting_confirmation: "Menunggu konfirmasi petugas",
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
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [finalizing, setFinalizing] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
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
          timer = setTimeout(() => void load(true), 3000);
        }
      }
    }

    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [since, refreshKey]);

  async function finalize(id: string) {
    if (finalizing) return;
    setFinalizing(id);
    setError("");
    setNotice("");
    try {
      await api(`/examinations/${id}/finalize`, { method: "POST", body: {} });
      setNotice(
        "Pemeriksaan sudah ditutup. Layar alat siap untuk anak berikutnya.",
      );
      setRefreshKey((value) => value + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setFinalizing("");
    }
  }

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
          onClick={() => setRefreshKey((value) => value + 1)}
        >
          <RefreshCw size={17} />
          {refreshing ? "Memperbarui…" : "Perbarui"}
        </button>
      </div>

      {notice && <Message>{notice}</Message>}
      {error && <Message error>{error}</Message>}

      {overview && (
        <>
          <div className="staff-stat-grid">
            <article className="staff-stat-card">
              <span className="staff-stat-icon">
                <Baby />
              </span>
              <div>
                <p>Anak tercatat</p>
                <strong>{overview.stats.totalChildren}</strong>
              </div>
            </article>
            <article className="staff-stat-card">
              <span className="staff-stat-icon">
                <Clock3 />
              </span>
              <div>
                <p>Pemeriksaan hari ini</p>
                <strong>{overview.stats.todayExaminations}</strong>
              </div>
            </article>
            <article className="staff-stat-card">
              <span className="staff-stat-icon">
                <CheckCircle2 />
              </span>
              <div>
                <p>Selesai hari ini</p>
                <strong>{overview.stats.todayCompleted}</strong>
              </div>
            </article>
            <article className="staff-stat-card">
              <span className="staff-stat-icon">
                <Activity />
              </span>
              <div>
                <p>Sesi aktif</p>
                <strong>{overview.stats.activeSessions}</strong>
              </div>
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
                    {item.status === "awaiting_confirmation" ? (
                      <button
                        className="portal-primary"
                        disabled={!!finalizing}
                        onClick={() => void finalize(item.id)}
                      >
                        <CheckCircle2 size={18} />
                        {finalizing === item.id
                          ? "Menutup…"
                          : "Selesaikan pemeriksaan"}
                      </button>
                    ) : (
                      <span className="row-readings">
                        {new Date(item.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
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
                      {item.status === "completed" && !item.finalizedAt
                        ? "Menunggu konfirmasi"
                        : EXAM_LABEL[item.status]}
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
