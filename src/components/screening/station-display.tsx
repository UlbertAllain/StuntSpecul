"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Activity,
  Camera,
  LoaderCircle,
  Ruler,
  Scale,
  Sparkles,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { MirrorAssignment } from "@/lib/portal";
import type { ScreeningCompletion } from "@/hooks/use-screening-session";
import { Mascot } from "./mascot";
import { NutriMirror } from "./nutri-mirror";

type StationActive = {
  status: "queued" | "running" | "completed";
  cameraEnabled: boolean;
  createdAt: number;
};

type StationState = { active: StationActive | null };

const STEPS = [
  { label: "Tinggi", caption: "Berdiri tegak", icon: Ruler },
  { label: "Berat", caption: "Diam sebentar", icon: Scale },
  { label: "Wajah", caption: "Lihat ke kamera", icon: Camera },
];

export function StationDisplay() {
  const [state, setState] = useState<StationState | null>(null);
  const [assignment, setAssignment] = useState<MirrorAssignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (assignment) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const value = await api<StationState>("/station/active", {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setState(value);
          setError("");
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(errorMessage(e));
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
    }

    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [assignment]);

  useEffect(() => {
    if (!assignment) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function watchFinalization() {
      try {
        const value = await api<StationState>("/station/active", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!value.active) {
          setAssignment(null);
          setState({ active: null });
          setError("");
          return;
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(errorMessage(e));
      }
      if (!controller.signal.aborted)
        timer = setTimeout(watchFinalization, 2000);
    }

    timer = setTimeout(watchFinalization, 2000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [assignment]);

  async function begin() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const claimed = await api<MirrorAssignment>("/station/claim", {
        method: "POST",
        body: {},
      });
      setAssignment({ ...claimed, cameraEnabled: !!claimed.cameraEnabled });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveCompletion(payload: ScreeningCompletion) {
    await api("/station/complete", {
      method: "POST",
      body: payload,
    });
  }

  async function finish(cancel: boolean) {
    if (cancel)
      await api("/station/cancel", {
        method: "POST",
        body: {},
      });
    setAssignment(null);
    setState({ active: null });
    setError("");
  }

  if (assignment)
    return (
      <NutriMirror
        key="station-running"
        assignment={assignment}
        canBegin
        onComplete={saveCompletion}
        onFinish={finish}
        awaitingStaffFinalize
      />
    );

  if (state?.active?.status === "completed")
    return (
      <main className="grid min-h-svh place-items-center bg-[var(--brand-ice)] p-6 text-[var(--ink)]">
        <section className="w-full max-w-[560px] overflow-hidden rounded-[2.5rem] border border-white/70 bg-white p-8 text-center shadow-2xl sm:p-10">
          <div className="mx-auto mb-4 w-44">
            <Image
              src="/images/stuntspecula-logo.jpeg"
              alt="StuntSpecula"
              width={1536}
              height={1024}
              className="h-20 w-full object-contain"
              priority
            />
          </div>
          <Mascot pose="cheer" interactive interaction="high-five" />
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--brand-ice)] px-4 py-2 text-sm font-extrabold text-[var(--blue)]">
            <Sparkles size={17} /> Hasil sudah tersimpan
          </span>
          <h1 className="mx-auto mt-5 max-w-md text-4xl font-black tracking-tight sm:text-5xl">
            Pemeriksaannya selesai!
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg leading-8 text-[var(--muted-foreground)]">
            Kamu hebat. Sekarang boleh turun dari alat dan istirahat sebentar.
          </p>
          <div className="mx-auto mt-7 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[#f7fbff] p-4 text-sm font-bold">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--blue)] opacity-50" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--blue)]" />
            </span>
            Menunggu petugas menyelesaikan sesi
          </div>
        </section>
      </main>
    );

  if (state?.active)
    return (
      <NutriMirror
        key={`station-ready-${state.active.createdAt}`}
        canBegin={!busy && !error}
        onBegin={begin}
        waitingLabel="Petugas sudah memilih profil anak. Tekan Aku siap! untuk memulai pemeriksaan."
      />
    );

  return (
    <main className="relative min-h-svh overflow-hidden bg-[var(--brand-ice)] px-5 py-6 text-[var(--ink)] sm:px-8">
      <div className="pointer-events-none absolute -left-20 top-20 h-56 w-56 rounded-full bg-white/45 blur-2xl" />
      <div className="pointer-events-none absolute -right-20 bottom-16 h-64 w-64 rounded-full bg-white/55 blur-2xl" />

      <div className="relative mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-[590px] flex-col">
        <header className="mb-4 flex items-center justify-between rounded-[1.75rem] border border-white/70 bg-white/90 px-5 py-3 shadow-sm backdrop-blur">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            className="h-16 w-40 object-contain"
            priority
          />
          <span className="inline-flex items-center gap-2 rounded-full bg-[#eef8f4] px-3 py-2 text-xs font-extrabold text-[#24634f]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3b8b70] opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3b8b70]" />
            </span>
            ALAT SIAP
          </span>
        </header>

        <section className="relative flex flex-1 flex-col overflow-hidden rounded-[2.4rem] border border-white/70 bg-white p-6 shadow-2xl sm:p-8">
          <div className="pointer-events-none absolute right-[-45px] top-[-45px] h-36 w-36 rounded-full bg-[var(--brand-ice)]" />

          {error ? (
            <div className="m-auto text-center">
              <Activity className="mx-auto mb-5" size={48} />
              <h1 className="text-3xl font-black">Koneksi alat terganggu</h1>
              <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
                {error}. Sistem akan mencoba terhubung kembali otomatis.
              </p>
            </div>
          ) : !state ? (
            <div className="m-auto text-center">
              <LoaderCircle className="mx-auto mb-5 animate-spin" size={48} />
              <h1 className="text-3xl font-black">Halo, sebentar ya…</h1>
              <p className="mt-4 text-[var(--muted-foreground)]">
                Mimo sedang menyiapkan alat pemeriksaan.
              </p>
            </div>
          ) : (
            <>
              <div className="relative z-10 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-ice)] px-4 py-2 text-xs font-extrabold tracking-[0.12em] text-[var(--blue)]">
                  <Sparkles size={16} /> HALO, AKU MIMO!
                </span>
                <h1 className="mx-auto mt-4 max-w-md text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">
                  Yuk, cek tumbuh kembangmu!
                </h1>
                <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
                  Nanti kita ukur tinggi, berat, lalu lihat ke kamera sebentar.
                  Gampang kok.
                </p>
              </div>

              <div className="relative z-10 mx-auto my-4 max-h-[280px] flex-1">
                <Mascot interactive />
              </div>

              <div className="relative z-10 grid grid-cols-3 gap-2.5">
                {STEPS.map((step, index) => (
                  <div
                    key={step.label}
                    className="rounded-2xl border border-[var(--border)] bg-[#fbfdff] p-3 text-center shadow-sm"
                  >
                    <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-ice)] text-[var(--blue)]">
                      <step.icon size={20} />
                    </span>
                    <strong className="mt-2 block text-sm">
                      {index + 1}. {step.label}
                    </strong>
                    <small className="mt-1 block text-[11px] leading-4 text-[var(--muted-foreground)]">
                      {step.caption}
                    </small>
                  </div>
                ))}
              </div>

              <div className="relative z-10 mt-4 flex items-center justify-center gap-3 rounded-2xl bg-[#f7fbff] px-4 py-3 text-center text-sm font-bold text-[var(--muted-foreground)]">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--blue)] opacity-40" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--blue)]" />
                </span>
                Menunggu petugas memilih anak dari dashboard
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
