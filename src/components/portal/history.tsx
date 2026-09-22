"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Examination } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { facialAnalysisLabel, formatReading } from "@/lib/screening";
import { growthStatusLabel } from "@/lib/growth";
import { Message } from "./shell";

const STATUS = {
  queued: "Menunggu",
  running: "Berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export function ExaminationHistory({ childId = "" }: { childId?: string }) {
  const [items, setItems] = useState<Examination[]>([]);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const result = await api<Examination[]>(
          `/examinations?childId=${encodeURIComponent(childId)}&page=${page}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setItems(result);
        setError("");
        if (
          result.some(
            (item) => item.status === "queued" || item.status === "running",
          )
        ) {
          timer = setTimeout(load, 5000);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [childId, page, revision]);

  return (
    <>
      <div className="section-heading compact-section-heading">
        <div>
          <h2>Riwayat pemeriksaan</h2>
          <p className="portal-note">
            Hasil utama langsung terlihat di daftar, tanpa masuk ke halaman
            lain.
          </p>
        </div>
        <button
          className="portal-text"
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={17} /> Perbarui
        </button>
      </div>

      {error && <Message error>{error}</Message>}

      {items.length === 0 ? (
        <div className="portal-empty">
          <h3>Belum ada pemeriksaan</h3>
          <p>Riwayat akan muncul setelah pemeriksaan dilakukan.</p>
        </div>
      ) : (
        <div className="flat-history-list">
          {items.map((item) => (
            <article className="flat-history-card" key={item.id}>
              <div className="flat-history-head">
                <div>
                  <h3>{item.childName}</h3>
                  <p>
                    {new Date(item.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <span className={`simple-badge status-${item.status}`}>
                  {STATUS[item.status]}
                </span>
              </div>
              <div className="history-metrics">
                <div>
                  <span>Tinggi</span>
                  <strong>{formatReading(item.heightCm)} cm</strong>
                </div>
                <div>
                  <span>Berat</span>
                  <strong>{formatReading(item.weightKg)} kg</strong>
                </div>
                <div>
                  <span>TB/U WHO</span>
                  <strong>{growthStatusLabel(item.growthStatus)}</strong>
                </div>
              </div>
              <div className="history-support-row">
                <span>Model A V2.1</span>
                <strong>
                  {item.facialStatus
                    ? facialAnalysisLabel(item.facialStatus)
                    : "Belum tersedia"}
                </strong>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="pagination">
        <button
          disabled={page === 0}
          className="portal-secondary"
          onClick={() => setPage((value) => value - 1)}
        >
          Sebelumnya
        </button>
        <span>Halaman {page + 1}</span>
        <button
          disabled={items.length < 50}
          className="portal-secondary"
          onClick={() => setPage((value) => value + 1)}
        >
          Berikutnya
        </button>
      </div>
    </>
  );
}
