"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import type { Examination } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { formatReading } from "@/lib/screening";
import { Message } from "./shell";
import { ResultSummary } from "./result-summary";

const STATUS = {
  queued: "Menunggu mulai",
  running: "Sedang diperiksa",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export function ExaminationHistory({
  childId = "",
  onBack,
}: {
  childId?: string;
  onBack?: () => void;
}) {
  const [items, setItems] = useState<Examination[]>([]);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Examination | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        const result = await api<Examination[]>(
          `/examinations?childId=${childId}&page=${page}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setItems(result);
        setSelected((current) =>
          current
            ? result.find((item) => item.id === current.id) || current
            : null,
        );
        setError("");
        if (result.some((r) => r.status === "queued" || r.status === "running"))
          timer = setTimeout(load, 5000);
      } catch (e) {
        if (!controller.signal.aborted) setError(errorMessage(e));
      }
    }

    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [childId, page, revision]);

  if (selected)
    return (
      <div className="history-detail">
        <button className="portal-text" onClick={() => setSelected(null)}>
          <ArrowLeft size={18} />
          Kembali ke riwayat
        </button>
        <ResultSummary result={selected} />
        <div className="portal-card">
          <h3>Status pemeriksaan</h3>
          <p>
            <span className={`status-label status-${selected.status}`}>
              {STATUS[selected.status]}
            </span>
          </p>
          <p className="portal-note">
            Data di halaman petugas bersifat monitoring. Hasil dan chatbot orang
            tua tetap terikat pada sesi pemeriksaan masing-masing.
          </p>
        </div>
        {error && <Message error>{error}</Message>}
      </div>
    );

  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{childId ? "Riwayat anak" : "Riwayat pemeriksaan"}</h2>
          <p className="portal-note">
            Seluruh pemeriksaan tampil otomatis dari flow orang tua dan mirror.
          </p>
        </div>
        <div className="portal-actions">
          {onBack && (
            <button className="portal-text" onClick={onBack}>
              <ArrowLeft size={17} />
              Data anak
            </button>
          )}
          <button
            className="portal-text"
            onClick={() => setRevision((v) => v + 1)}
          >
            <RefreshCw size={17} />
            Perbarui
          </button>
        </div>
      </div>

      {error && <Message error>{error}</Message>}

      {items.length === 0 ? (
        <div className="portal-empty">
          <h3>Belum ada pemeriksaan</h3>
          <p>Riwayat akan muncul setelah orang tua memulai screening.</p>
        </div>
      ) : (
        <div className="examination-list">
          {items.map((item) => (
            <button
              key={item.id}
              className="examination-row"
              onClick={() => setSelected(item)}
            >
              <span>
                <strong>{item.childName}</strong>
                <small>
                  {item.childCode} ·{" "}
                  {new Date(item.createdAt).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </small>
              </span>
              <span className={`status-label status-${item.status}`}>
                {STATUS[item.status]}
              </span>
              <span className="row-readings">
                {formatReading(item.heightCm)} cm /{" "}
                {formatReading(item.weightKg)} kg
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      )}

      <div className="pagination">
        <button
          disabled={page === 0}
          className="portal-secondary"
          onClick={() => setPage((p) => p - 1)}
        >
          Sebelumnya
        </button>
        <span>Halaman {page + 1}</span>
        <button
          disabled={items.length < 50}
          className="portal-secondary"
          onClick={() => setPage((p) => p + 1)}
        >
          Berikutnya
        </button>
      </div>
    </>
  );
}
