"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  QrCode,
  Download,
} from "lucide-react";
import type { Examination } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { formatReading } from "@/lib/screening";
import { Message } from "./shell";
import { ResultSummary } from "./result-summary";

const STATUS = {
  queued: "Menunggu di mirror",
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
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [share, setShare] = useState<{
    url: string;
    qr: string;
    expiresAt: number;
  } | null>(null);
  const [notice, setNotice] = useState("");
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
  async function action(path: string, method: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const value = await api<{ url: string; qr: string; expiresAt: number }>(
        path,
        { method, body: {} },
      );
      if (method === "POST") setShare(value);
      else {
        setShare(null);
        setSelected(null);
        setRevision((v) => v + 1);
        setNotice("Akses atau sesi sudah dihentikan.");
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (selected)
    return (
      <div className="history-detail">
        <button
          className="portal-text"
          onClick={() => {
            setSelected(null);
            setShare(null);
            setNotice("");
          }}
        >
          <ArrowLeft size={18} />
          Kembali ke history
        </button>
        <ResultSummary result={selected} />
        {selected.status === "completed" ? (
          <div className="portal-card">
            <h3>
              <QrCode /> Akses untuk orang tua
            </h3>
            <p>
              Berikan QR langsung kepada pendamping anak. QR baru menggantikan
              akses sebelumnya.
            </p>
            <div className="portal-actions">
              <button
                disabled={busy}
                className="portal-primary"
                onClick={() =>
                  action(`/examinations/${selected.id}/access`, "POST")
                }
              >
                {busy ? "Memproses…" : "Buat QR akses hasil"}
              </button>
              <button
                disabled={busy}
                className="portal-secondary"
                onClick={() =>
                  action(`/examinations/${selected.id}/access`, "DELETE")
                }
              >
                Cabut akses
              </button>
            </div>
            {share && (
              <div className="result-share">
                <div
                  className="qr-image"
                  dangerouslySetInnerHTML={{ __html: share.qr }}
                />
                <p>
                  Berlaku sampai{" "}
                  {new Date(share.expiresAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · sekali pakai
                </p>
                <a
                  className="portal-text"
                  href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(share.qr)}`}
                  download="qr-hasil-stuntspecula.svg"
                >
                  <Download size={18} />
                  Unduh QR untuk slip hasil
                </a>
                <button
                  className="portal-text"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(share.url);
                      setNotice(
                        "Tautan tersalin. Berikan hanya kepada pendamping anak ini.",
                      );
                    } catch {
                      setNotice("Clipboard tidak tersedia. Gunakan QR.");
                    }
                  }}
                >
                  Salin tautan
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="portal-card">
            <p>{STATUS[selected.status]}</p>
            {selected.status !== "cancelled" && (
              <button
                disabled={busy}
                className="portal-secondary"
                onClick={() => action(`/examinations/${selected.id}`, "DELETE")}
              >
                Batalkan sesi ini
              </button>
            )}
          </div>
        )}
        {error && <Message error>{error}</Message>}
        {notice && <Message>{notice}</Message>}
      </div>
    );
  return (
    <>
      <div className="section-heading">
        <h2>{childId ? "History anak" : "History pemeriksaan"}</h2>
        <div className="portal-actions">
          {onBack && (
            <button className="portal-text" onClick={onBack}>
              <ArrowLeft size={17} />
              Daftar anak
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
      {notice && <Message>{notice}</Message>}
      {items.length === 0 ? (
        <div className="portal-empty">
          <h3>Belum ada pemeriksaan di halaman ini</h3>
          <p>Hasil akan muncul setelah petugas memulai sesi untuk anak.</p>
        </div>
      ) : (
        <div className="examination-list">
          {items.map((item) => (
            <button
              key={item.id}
              className="examination-row"
              onClick={() => {
                setSelected(item);
                setShare(null);
              }}
            >
              <span>
                <strong>{item.childName}</strong>
                <small>
                  {item.childCode} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString("id-ID")}
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
