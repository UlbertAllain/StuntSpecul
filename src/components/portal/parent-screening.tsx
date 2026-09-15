"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, Smartphone } from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import { Message, PortalShell } from "./shell";

type ScreeningStatus =
  | "waiting_parent"
  | "parent_connected"
  | "ready"
  | "running"
  | "completed"
  | "cancelled";

type ParentState = {
  id: string;
  status: ScreeningStatus;
  childName: string | null;
  resultReady: boolean;
  expiresAt: number;
};

export function ParentScreening() {
  const [state, setState] = useState<ParentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [guardian, setGuardian] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      try {
        const code = window.location.hash.slice(1);
        if (code) {
          window.history.replaceState(null, "", window.location.pathname);
          await api("/screening/parent/exchange", {
            method: "POST",
            body: { code },
            signal: controller.signal,
          });
        }
        const current = await api<ParentState>("/screening/parent", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setState(current);
      } catch (e) {
        if (!controller.signal.aborted) setError(errorMessage(e));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void initialize();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!state || !["ready", "running", "completed"].includes(state.status))
      return;
    if (state.status === "completed") {
      void openResult();
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const current = await api<ParentState>("/screening/parent", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setState(current);
          setError("");
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(errorMessage(e));
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
    }
    timer = setTimeout(poll, 1000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [state?.status, state?.id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!sex || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/screening/parent/profile", {
        method: "POST",
        body: { name, birthDate, sex, guardian },
      });
      setState(await api<ParentState>("/screening/parent"));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function openResult() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/screening/parent/finalize", { method: "POST", body: {} });
      window.location.assign("/hasil");
    } catch (e) {
      if (!(e instanceof ClientError && e.status === 409))
        setError(errorMessage(e));
      setBusy(false);
    }
  }

  if (loading)
    return (
      <PortalShell
        heading="Menghubungkan ke alat"
        subtitle="Sebentar, kami sedang menyiapkan sesi pemeriksaan."
      >
        <div className="portal-card parent-intake-status">
          <LoaderCircle className="spin" />
          <p>Menghubungkan HP Anda dengan StuntSpecula…</p>
        </div>
      </PortalShell>
    );

  if (!state)
    return (
      <PortalShell
        heading="Sesi belum terhubung"
        subtitle="Scan QR yang tampil pada layar StuntSpecula untuk memulai."
      >
        <div className="portal-card parent-intake-status">
          <Smartphone size={42} />
          <p>QR mungkin sudah kedaluwarsa atau sesi telah selesai.</p>
          {error && <Message error>{error}</Message>}
        </div>
      </PortalShell>
    );

  if (state.status === "cancelled")
    return (
      <PortalShell heading="Pemeriksaan dibatalkan">
        <div className="portal-card parent-intake-status">
          <p>Silakan kembali ke layar alat dan mulai sesi baru.</p>
        </div>
      </PortalShell>
    );

  if (["ready", "running", "completed"].includes(state.status))
    return (
      <PortalShell
        heading={
          state.status === "running"
            ? `Pemeriksaan ${state.childName || "si kecil"} sedang berlangsung`
            : state.status === "completed"
              ? "Hasil sudah siap"
              : `Data ${state.childName || "si kecil"} sudah siap`
        }
        subtitle="HP ini tetap terhubung dengan pemeriksaan di alat."
      >
        <div className="portal-card parent-intake-status">
          {state.status === "completed" ? (
            <CheckCircle2 size={48} />
          ) : (
            <LoaderCircle className="spin" size={44} />
          )}
          <h2>
            {state.status === "ready"
              ? "Ajak si kecil berdiri di atas alat"
              : state.status === "running"
                ? "Temani si kecil sampai pemeriksaan selesai"
                : "Membuka hasil pemeriksaan…"}
          </h2>
          <p>
            {state.status === "ready"
              ? "Data sudah masuk. Lanjutkan dari layar StuntSpecula."
              : state.status === "running"
                ? "Hasil akan muncul otomatis di HP ini setelah pemeriksaan selesai."
                : "Sebentar, kami sedang menyiapkan hasil dan akses Asisten Hasil."}
          </p>
          {error && <Message error>{error}</Message>}
        </div>
      </PortalShell>
    );

  return (
    <PortalShell
      heading="Kenalan dulu dengan si kecil"
      subtitle="Isi data singkat berikut. Tidak perlu membuat akun atau login."
    >
      <form className="portal-card profile-form parent-intake-form" onSubmit={submit}>
        <label>
          Nama anak
          <input
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Aira"
            autoComplete="off"
          />
        </label>
        <label>
          Tanggal lahir
          <input
            required
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
          <small>Usia akan dihitung otomatis dalam bulan untuk pemeriksaan.</small>
        </label>
        <label>
          Jenis kelamin
          <select
            required
            value={sex}
            onChange={(event) =>
              setSex(event.target.value as "male" | "female" | "")
            }
          >
            <option value="">Pilih jenis kelamin</option>
            <option value="male">Laki-laki</option>
            <option value="female">Perempuan</option>
          </select>
        </label>
        <label>
          Nama orang tua / wali <span className="optional-label">opsional</span>
          <input
            maxLength={80}
            value={guardian}
            onChange={(event) => setGuardian(event.target.value)}
            placeholder="Boleh dikosongkan"
            autoComplete="name"
          />
        </label>
        <button className="portal-primary parent-start-button" disabled={busy}>
          {busy ? "Menyiapkan pemeriksaan…" : "Mulai pemeriksaan"}
          <ArrowRight size={19} />
        </button>
        <p className="portal-note">
          Data ini digunakan untuk sesi pemeriksaan dan hasil pertumbuhan si
          kecil. Hindari memasukkan NIK atau alamat rumah.
        </p>
        {error && <Message error>{error}</Message>}
      </form>
    </PortalShell>
  );
}
