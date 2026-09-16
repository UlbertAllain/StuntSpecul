"use client";

import { useEffect, useState } from "react";
import { History, Play, Search, UserRound } from "lucide-react";
import type { ChildProfile } from "@/lib/portal";
import { ageInMonths } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { formatAge } from "@/lib/screening";
import { ExaminationHistory } from "./history";
import { Message } from "./shell";

export function ChildrenPanel() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<ChildProfile[]>(`/children?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then(setChildren)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, [query]);

  async function start(child: ChildProfile) {
    if (busyId) return;
    setBusyId(child.id);
    setError("");
    setNotice("");
    try {
      await api("/examinations", {
        method: "POST",
        body: { childId: child.id, cameraEnabled: true, canStand: true },
      });
      setNotice(
        `Pemeriksaan ${child.name} sudah dikirim ke alat. Arahkan anak ke StuntSpecula.`,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId("");
    }
  }

  if (history)
    return (
      <ExaminationHistory childId={history} onBack={() => setHistory("")} />
    );

  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Data anak</h2>
          <p className="portal-note">
            Pilih profil anak yang akan diperiksa. Hasil pengukuran akan masuk
            otomatis ke riwayat anak dan akun orang tua yang terhubung.
          </p>
        </div>
      </div>

      {notice && <Message>{notice}</Message>}
      {error && <Message error>{error}</Message>}

      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
        }}
      >
        <Search size={20} />
        <input
          aria-label="Cari anak"
          placeholder="Cari nama atau kode anak…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={80}
        />
        <button className="portal-secondary">Cari</button>
      </form>

      {children.length === 0 ? (
        <div className="portal-empty">
          <UserRound />
          <h3>{query ? "Data anak tidak ditemukan" : "Belum ada data anak"}</h3>
          <p>
            Profil anak akan muncul setelah terdaftar pada sistem StuntSpecula.
          </p>
        </div>
      ) : (
        <div className="child-list">
          {children.map((child) => {
            const months = ageInMonths(child.birthDate);
            const eligible = months >= 24 && months <= 59;
            return (
              <article className="child-row" key={child.id}>
                <span className="child-avatar">
                  {child.name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h3>{child.name}</h3>
                  <p>
                    {child.code} · {formatAge(months)}
                  </p>
                  <small>
                    {child.sex === "male" ? "Laki-laki" : "Perempuan"}
                    {child.guardian
                      ? ` · Orang tua/wali: ${child.guardian}`
                      : ""}
                  </small>
                  {!eligible && (
                    <small className="field-error">
                      Alat standing height saat ini digunakan untuk usia 24–59
                      bulan.
                    </small>
                  )}
                </div>
                <div className="portal-actions">
                  <button
                    className="portal-secondary"
                    onClick={() => setHistory(child.id)}
                  >
                    <History size={18} />
                    Riwayat
                  </button>
                  <button
                    className="portal-primary"
                    disabled={!eligible || !!busyId}
                    onClick={() => void start(child)}
                  >
                    <Play size={18} />
                    {busyId === child.id ? "Mengirim…" : "Mulai pemeriksaan"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
