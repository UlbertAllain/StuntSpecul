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

type CreatedMirrorSession = Omit<MirrorSessionState, "assignment"> & {
  url: string;
  qr: string;
};

export function MirrorStation() {
  const [session, setSession] = useState<MirrorSessionState | null>(null);
  const [pairing, setPairing] = useState<CreatedMirrorSession | null>(null);
  const [active, setActive] = useState<MirrorAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sessionId = session?.id;
  const sessionStatus = session?.status;

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
    if (!sessionId || active || sessionStatus === "cancelled") return;
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
  }, [sessionId, sessionStatus, active]);

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
      setSession({ ...created, assignment: null });
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
      const created = await api<CreatedMirrorSession>("/screening/session", {
        method: "POST",
        body: {},
      });
      setPairing(created);
      setSession({ ...created, assignment: null });
      setActive(null);
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
      <main className="grid min-h-svh place-items-center bg-[var(--brand-ice)] p-8 text-[var(--ink)]">
        <p className="text-lg font-bold">Menyiapkan StuntSpecula…</p>
      </main>
    );

  if (active)
    return (
      <NutriMirror
        key={`running-${active.id}`}
        assignment={active}
        canBegin
        onFinish={finish}
      />
    );

  if (session?.assignment)
    return (
      <NutriMirror
        key={`ready-${session.assignment.id}`}
        canBegin={!busy && !error}
        onBegin={begin}
        waitingLabel="Data si kecil sudah siap. Bantu si kecil berdiri di atas alat, ya."
      />
    );

  if (session)
    return (
      <main className="min-h-svh bg-[var(--brand-ice)] p-8 text-[var(--ink)] md:p-12">
        <header className="mx-auto mb-6 w-52 rounded-3xl bg-white px-5 shadow-sm">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            className="h-28 w-full object-contain"
            priority
          />
        </header>
        <section className="mx-auto grid max-w-5xl gap-8 rounded-[2rem] border border-[var(--border)] bg-white p-8 shadow-xl md:grid-cols-[1fr_360px] md:p-12">
          <div className="flex flex-col justify-center gap-5">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--brand-ice)] px-4 py-2 text-sm font-extrabold text-[var(--blue)]">
              <Smartphone size={20} /> HP Ayah & Bunda
            </span>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              {session.status === "parent_connected"
                ? "Sudah terhubung!"
                : "Isi data si kecil lewat HP"}
            </h1>
            <p className="max-w-xl text-lg leading-8 text-[var(--muted-foreground)]">
              {session.status === "parent_connected"
                ? "Silakan lengkapi data si kecil di HP. Setelah selesai, layar ini akan lanjut otomatis."
                : "Scan QR atau buka link di samping. Tidak perlu membuat akun atau login."}
            </p>
            <p className="rounded-2xl bg-[#f6faff] p-4 font-bold" role="status">
              {error ||
                (session.status === "parent_connected"
                  ? "Menunggu Bunda atau Ayah menyelesaikan data si kecil…"
                  : "Menunggu QR dibuka dari HP…")}
            </p>
          </div>

          {pairing ? (
            <div className="flex flex-col items-center justify-center gap-4">
              <div
                className="w-full max-w-[320px] rounded-3xl border border-[var(--border)] bg-white p-3 [&_svg]:h-auto [&_svg]:w-full"
                aria-label="QR untuk membuka formulir pemeriksaan"
                dangerouslySetInnerHTML={{ __html: pairing.qr }}
              />
              <div className="flex w-full items-start gap-2 rounded-xl bg-[#f6faff] p-3 text-xs leading-5 break-all">
                <Link2 className="mt-0.5 shrink-0" size={17} />
                <span>{pairing.url}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-[#f6faff] p-8 text-center">
              <QrCode size={52} />
              <p>QR lama tidak tersimpan setelah layar dimuat ulang.</p>
              <button
                className="rounded-xl bg-[var(--blue)] px-5 py-3 font-extrabold text-white"
                disabled={busy}
                onClick={restartSession}
              >
                <RefreshCw size={18} className="mr-2 inline" /> Buat QR baru
              </button>
            </div>
          )}
        </section>
      </main>
    );

  return (
    <main className="grid min-h-svh place-items-center bg-[var(--brand-ice)] p-8 text-[var(--ink)]">
      <section className="w-full max-w-4xl rounded-[2rem] border border-[var(--border)] bg-white p-10 text-center shadow-xl md:p-16">
        <Image
          src="/images/stuntspecula-logo.jpeg"
          alt="StuntSpecula"
          width={1536}
          height={1024}
          className="mx-auto mb-6 h-32 w-56 object-contain"
          priority
        />
        <span className="hello-line">Halo, Ayah & Bunda!</span>
        <h1 className="mx-auto mt-4 max-w-3xl text-5xl font-black tracking-tight md:text-6xl">
          Yuk, cek pertumbuhan si kecil.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
          Siapkan HP Anda. Data anak diisi sendiri oleh orang tua, lalu Mimo
          akan menemani si kecil selama pemeriksaan.
        </p>
        <button
          className="primary-button mx-auto mt-8"
          disabled={busy}
          onClick={createSession}
        >
          {busy ? "Menyiapkan…" : "Mulai"}
          <ArrowRight />
        </button>
        {error && <p className="field-error mt-5">{error}</p>}
      </section>
    </main>
  );
}
