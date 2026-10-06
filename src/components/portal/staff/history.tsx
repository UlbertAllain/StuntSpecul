"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import type { Examination } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import {
  facialAnalysisLabel,
  formatReading,
  visualAnalysisStatusLabel,
} from "@/lib/screening";
import { growthStatusLabel } from "@/lib/growth";
import { Message } from "../shared/shell";

const STATUS = {
  queued: "Menunggu",
  running: "Berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

type ExportPeriod = "today" | "week" | "month" | "all" | "custom";

function localDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function exportRange(period: ExportPeriod, customStart: string, customEnd: string) {
  const now = new Date();
  if (period === "all") return { from: null, to: null };

  if (period === "custom") {
    if (!customStart || !customEnd) return null;
    const from = new Date(`${customStart}T00:00:00`);
    const to = new Date(`${customEnd}T23:59:59.999`);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
      return null;
    }
    return { from: from.getTime(), to: to.getTime() };
  }

  const from = new Date(now);
  if (period === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - day);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }

  return { from: from.getTime(), to: now.getTime() };
}

export function ExaminationHistory({ childId = "" }: { childId?: string }) {
  const [items, setItems] = useState<Examination[]>([]);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>("today");
  const [customStart, setCustomStart] = useState(() => localDateInput(new Date()));
  const [customEnd, setCustomEnd] = useState(() => localDateInput(new Date()));
  const [exporting, setExporting] = useState(false);

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

  async function exportExcel() {
    if (exporting) return;
    const range = exportRange(exportPeriod, customStart, customEnd);
    if (!range) {
      setError("Rentang tanggal export belum valid.");
      return;
    }

    const params = new URLSearchParams();
    if (range.from !== null) params.set("from", String(range.from));
    if (range.to !== null) params.set("to", String(range.to));
    params.set("period", exportPeriod);
    if (childId) params.set("childId", childId);

    setExporting(true);
    setError("");
    try {
      const response = await fetch(`/api/examinations/export?${params}`, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "Export Excel gagal dibuat.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || "hasil-pemeriksaan-stuntspecula.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export Excel gagal dibuat.");
    } finally {
      setExporting(false);
    }
  }

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

      <section className="staff-history-toolbar" aria-label="Export hasil pemeriksaan">
        <label>
          Periode export
          <select
            value={exportPeriod}
            onChange={(event) =>
              setExportPeriod(event.target.value as ExportPeriod)
            }
          >
            <option value="today">Hari ini</option>
            <option value="week">Minggu ini</option>
            <option value="month">Bulan ini</option>
            <option value="all">Semua hasil</option>
            <option value="custom">Rentang tanggal</option>
          </select>
        </label>

        {exportPeriod === "custom" ? (
          <div className="staff-history-custom-range">
            <label>
              Dari tanggal
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
              />
            </label>
            <label>
              Sampai tanggal
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </label>
          </div>
        ) : (
          <div />
        )}

        <button
          type="button"
          className="portal-primary staff-history-export-button"
          disabled={exporting}
          onClick={() => void exportExcel()}
        >
          <Download size={17} />
          {exporting ? "Menyiapkan Excel…" : "Export Excel"}
        </button>

        <p className="staff-history-export-note">
          File berisi hasil pemeriksaan selesai, Z-score WHO, status stunting,
          dan foto anak yang tersedia.
        </p>
      </section>

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
                <span>AI visual pendukung</span>
                <strong>
                  {item.visualAnalysis
                    ? visualAnalysisStatusLabel(item.visualAnalysis.status)
                    : item.facialStatus
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
