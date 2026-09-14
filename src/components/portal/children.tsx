"use client";
import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  ArrowRight,
  History,
  UserRound,
  Check,
} from "lucide-react";
import type { ChildProfile } from "@/lib/portal";
import { api, errorMessage } from "@/lib/api-client";
import { Checkbox } from "@/components/ui/checkbox";
import { ageInMonths } from "@/lib/portal";
import { formatAge } from "@/lib/screening";
import { ExaminationHistory } from "./history";
import { Message } from "./shell";

export function ChildrenPanel() {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<ChildProfile | null>(null);
  const [history, setHistory] = useState("");
  const [canStand, setCanStand] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
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
  }, [query, revision]);
  async function saveChild(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    try {
      await api("/children", {
        method: "POST",
        body: Object.fromEntries(new FormData(form)),
      });
      setAdding(false);
      setRevision((v) => v + 1);
      setNotice("Profil anak tersimpan.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api("/examinations", {
        method: "POST",
        body: {
          childId: selected.id,
          canStand,
          cameraEnabled,
        },
      });
      window.location.assign("/");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (history)
    return (
      <ExaminationHistory childId={history} onBack={() => setHistory("")} />
    );
  return (
    <>
      <div className="section-heading">
        <h2>Siapa yang datang hari ini?</h2>
        <button
          className="portal-primary"
          onClick={() => {
            setAdding((v) => !v);
            setError("");
          }}
        >
          <Plus size={18} />
          {adding ? "Tutup form" : "Tambah anak"}
        </button>
      </div>
      {error && <Message error>{error}</Message>}
      {notice && <Message>{notice}</Message>}
      {adding && (
        <form className="portal-card profile-form" onSubmit={saveChild}>
          <h3>Profil anak baru</h3>
          <div className="form-grid">
            <label>
              Kode anak
              <input
                name="code"
                required
                placeholder="Kode lokal fasilitas"
                minLength={2}
                maxLength={40}
                pattern="[A-Za-z0-9._\-]+"
              />
            </label>
            <label>
              Nama anak
              <input name="name" required minLength={2} maxLength={80} />
            </label>
            <label>
              Tanggal lahir
              <input
                name="birthDate"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label>
              Jenis kelamin
              <select name="sex" defaultValue="male">
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </label>
            <label>
              Nama pendamping
              <input name="guardian" required minLength={2} maxLength={80} />
            </label>
          </div>
          <button className="portal-primary" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan profil"}
          </button>
        </form>
      )}
      {selected && (
        <div className="portal-card start-exam">
          <h3>Mulai pemeriksaan {selected.name}</h3>
          <p>
            {formatAge(ageInMonths(selected.birthDate))} · {selected.code}
          </p>
          <label className="checkbox-label">
            <Checkbox
              checked={canStand}
              onCheckedChange={(v) => setCanStand(v === true)}
            />
            Anak sudah bisa berdiri tanpa bantuan.
          </label>
          <label className="checkbox-label">
            <Checkbox
              checked={cameraEnabled}
              onCheckedChange={(v) => setCameraEnabled(v === true)}
            />
            Gunakan kamera dengan izin pendamping.
          </label>
          <div className="portal-actions">
            <button
              className="portal-primary"
              disabled={busy || !canStand}
              onClick={start}
            >
              <Check size={18} />
              {busy ? "Menyiapkan…" : "Mulai pemeriksaan"}
            </button>
            <button className="portal-text" onClick={() => setSelected(null)}>
              Batal
            </button>
          </div>
        </div>
      )}
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
          <h3>
            {query ? "Profil belum ditemukan" : "Mulai dengan profil anak"}
          </h3>
          <p>
            Gunakan kode anak yang sama pada kunjungan berikutnya agar history
            terhubung.
          </p>
        </div>
      ) : (
        <div className="child-list">
          {children.map((child) => (
            <article className="child-row" key={child.id}>
              <span className="child-avatar">
                {child.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h3>{child.name}</h3>
                <p>
                  {child.code} · {formatAge(ageInMonths(child.birthDate))}
                </p>
                <small>Pendamping: {child.guardian}</small>
              </div>
              <div className="portal-actions">
                <button
                  className="portal-text"
                  onClick={() => setHistory(child.id)}
                >
                  <History size={18} />
                  History
                </button>
                <button
                  className="portal-secondary"
                  onClick={() => {
                    setSelected(child);
                    setCanStand(false);
                    setError("");
                    setNotice("");
                  }}
                >
                  <ArrowRight size={18} />
                  Periksa
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
