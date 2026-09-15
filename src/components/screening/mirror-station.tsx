"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, Link2, QrCode, RefreshCw, Smartphone } from "lucide-react";
import type { MirrorAssignment } from "@/lib/portal";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import { NutriMirror } from "./nutri-mirror";

interface MirrorSessionState {
  id: string;
  status:
    | "waiting_parent"
    | "parent_connected"
    | "ready"
    | "running"
    | "completed"
    | "cancelled";
  expiresAt: number;
  assignment: MirrorAssignment | null;
}

interface CreatedMirrorSession extends MirrorSessionState {
  url: string;
  qr: string;
}

export function MirrorStation() {
  const [session, setSession] = useState<MirrorSessionState | null>(null);
  const [pairing, setPairing] = useState<CreatedMirrorSession | null>(null);
  const [active, setActive] = useState<MirrorAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function restore() {
      try {
        const current = await api<MirrorSessionState>("/screening/mirror", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setSession(current);
      } catch (e) {
        if (
          !controller.signal.aborted &&
          (!(e instanceof ClientError) || e.status !== 401)
        )
          setError(errorMessage(e));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void restore();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!session || active || session.status === "cancelled") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const current = await api<MirrorSessionState>("/screening/mirror", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setSession(current);
        setError("");
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof ClientError && e.status === 401) {
          setSession(null);
          setPairing(null);
        } else {
          setError(errorMessage(e));
        }
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
    }
    timer = setTimeout(poll, 1000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [session?.id, active]);

  async function createSession() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const created = await api<CreatedMirrorSession>("/screening/session", {
        method: "POST",
        body: {},
      });
      setPairing(created);
      setSession(created);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function restartSession() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (session)
        await api("/screening/mirror/cancel", { method: "POST", body: {} });
      setSession(null);
      setPairing(null);
      setActive(null);
      const created = await api<CreatedMirrorSession>("/screening/session", {
        method: "POST",
        body: {},
      });
      setPairing(created);
      setSession(created);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function begin() {
    if (!session?.assignment || busy) return;
    setBusy(true);
    setError("");
    try {
      const assignment = await api<MirrorAssignment>(
        "/screening/mirror/claim",
        { method: "POST", body: {} },
      );
      setActive({ ...assignment, cameraEnabled: !!assignment.cameraEnabled });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function finish(cancel: boolean) {
    if (cancel)
      await api("/screening/mirror/cancel", { method: "POST", body: {} });
    setActive(null);
    setSession(null);
    setPairing(null);
    setError("");
  }

  if (loading)
    return (
      <main className="mirror-pair-shell">
        <p className="mirror-pair-status">Menyiapkan StuntSpecula…</p>
      </main>
    );

  if (active)
    return (
      <NutriMirror
        key={active.id}
        assignment={active}
        canBegin
        onFinish={finish}
      />
    );

  if (session?.assignment)
    return (
      <NutriMirror
        key={session.assignment.id}
        assignment={session.assignment}
        canBegin={!busy && !error}
        onBegin={begin}
        onFinish={finish}
        waitingLabel="Data si kecil sudah siap. Bantu si kecil berdiri di atas alat, ya."
      />
    );

  if (session)
    return (
      <main className="mirror-pair-shell">
        <header className="mirror-pair-brand">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            priority
          />
        </header>
        <section className="mirror-pair-card">
          <div className="mirror-pair-copy">
            <span className="mirror-pair-kicker">
              <Smartphone size={20} /> HP Ayah & Bunda
            </span>
            <h1>
              {session.status === "parent_connected"
                ? "Sudah terhubung!"
                : "Isi data si kecil lewat HP"}
            </h1>
            <p>
              {session.status === "parent_connected"
                ? "Silakan lengkapi data si kecil di HP. Setelah selesai, layar ini akan lanjut otomatis."
                : "Scan QR atau buka link di samping. Tidak perlu membuat akun atau login."}
            </p>
          </div>

          {pairing ? (
            <div className="mirror-pair-qr-area">
              <div
                className="mirror-pair-qr"
                aria-label="QR untuk membuka formulir pemeriksaan"
                dangerouslySetInnerHTML={{ __html: pairing.qr }}
              />
              <div className="mirror-pair-link">
                <Link2 size={18} />
                <span>{pairing.url}</span>
              </div>
            </div>
          ) : (
            <div className="mirror-pair-recover">
              <QrCode size={52} />
              <p>QR lama tidak tersimpan setelah layar dimuat ulang.</p>
              <button disabled={busy} onClick={restartSession}>
                <RefreshCw size={18} /> Buat QR baru
              </button>
            </div>
          )}

          <p className="mirror-pair-status" role="status">
            {error ||
              (session.status === "parent_connected"
                ? "Menunggu Bunda atau Ayah menyelesaikan data si kecil…"
                : "Menunggu QR dibuka dari HP…")}
          </p>
        </section>
      </main>
    );

  return (
    <main className="mirror-pair-shell mirror-opening">
      <header className="mirror-pair-brand">
        <Image
          src="/images/stuntspecula-logo.jpeg"
          alt="StuntSpecula"
          width={1536}
          height={1024}
          priority
        />
      </header>
      <section className="mirror-opening-card">
        <div>
          <span className="hello-line">Halo, Ayah & Bunda!</span>
          <h1>Yuk, cek pertumbuhan si kecil.</h1>
          <p>
            Siapkan HP Anda. Data anak diisi sendiri oleh orang tua, lalu Mimo
            akan menemani si kecil selama pemeriksaan.
          </p>
        </div>
        <button className="primary-button" disabled={busy} onClick={createSession}>
          {busy ? "Menyiapkan…" : "Mulai"}
          <ArrowRight />
        </button>
        {error && <p className="field-error">{error}</p>}
      </section>
    </main>
  );
}
