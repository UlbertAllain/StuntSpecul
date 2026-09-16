"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Activity,
  Camera,
  CheckCircle2,
  LoaderCircle,
  Ruler,
  Scale,
  Sparkles,
  WandSparkles,
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
  {
    label: "Tinggi",
    caption: "Berdiri tegak",
    icon: Ruler,
    accent: "bg-[#e8f4ff] text-[#2f6f9f]",
  },
  {
    label: "Berat",
    caption: "Diam sebentar",
    icon: Scale,
    accent: "bg-[#fff0f6] text-[#a43f6a]",
  },
  {
    label: "Wajah",
    caption: "Lihat kamera",
    icon: Camera,
    accent: "bg-[#eef9f4] text-[#39765f]",
  },
] as const;

const WAITING_TIPS = [
  "Nanti cukup berdiri tegak dan santai, ya.",
  "Mimo akan menemani sampai pemeriksaan selesai.",
  "Pemeriksaannya singkat: tinggi, berat, lalu kamera.",
];

export function StationDisplay() {
  const [state, setState] = useState<StationState | null>(null);
  const [assignment, setAssignment] = useState<MirrorAssignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (assignment || state?.active) return;
    const timer = setInterval(
      () => setTipIndex((index) => (index + 1) % WAITING_TIPS.length),
      3800,
    );
    return () => clearInterval(timer);
  }, [assignment, state?.active]);

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
      <main className="relative grid min-h-svh place-items-center overflow-hidden bg-[linear-gradient(180deg,#d9efff_0%,#c7e5ff_45%,#ffe6ef_100%)] p-5 text-[var(--ink)]">
        <div className="pointer-events-none absolute -left-16 top-16 h-44 w-44 rounded-full bg-white/45 blur-2xl" />
        <div className="pointer-events-none absolute -right-20 bottom-8 h-56 w-56 rounded-full bg-white/55 blur-2xl" />

        <section className="relative w-full max-w-[550px] overflow-hidden rounded-[2.4rem] border border-white/80 bg-white/95 px-7 py-6 text-center shadow-[0_24px_70px_rgba(48,107,159,0.18)] backdrop-blur sm:px-9">
          <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#eef8f4] px-4 py-2 text-xs font-extrabold tracking-[0.1em] text-[#27644f]">
            <CheckCircle2 size={16} /> PEMERIKSAAN SELESAI
          </span>

          <div className="mx-auto mt-3 w-[205px] sm:w-[230px]">
            <Mascot pose="cheer" interactive interaction="high-five" />
          </div>

          <h1 className="mx-auto mt-2 max-w-md text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">
            Yeay, kamu hebat!
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
            Semua tahap sudah selesai. Sekarang kamu boleh turun dari alat dan
            istirahat sebentar.
          </p>

          <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-[#cfe1f1] bg-[#f4f9fd] px-4 py-3 text-sm font-extrabold text-[#365a78]">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--blue)] opacity-45" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--blue)]" />
            </span>
            Petugas sedang menutup sesi pemeriksaan
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
    <main className="relative min-h-svh overflow-hidden bg-[linear-gradient(180deg,#d8efff_0%,#c5e4ff_56%,#ffdce9_100%)] px-4 py-4 text-[var(--ink)] sm:px-6">
      <div className="pointer-events-none absolute -left-16 top-24 h-48 w-48 rounded-full bg-white/55 blur-2xl" />
      <div className="pointer-events-none absolute -right-20 top-[38%] h-56 w-56 rounded-full bg-[#fff1f6]/70 blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-70px] left-[18%] h-52 w-52 rounded-full bg-white/45 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-[570px] flex-col">
        <header className="flex items-center justify-between px-2 py-1">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            className="h-14 w-36 rounded-2xl object-contain mix-blend-multiply sm:h-16 sm:w-40"
            priority
          />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-2 text-[11px] font-black tracking-[0.08em] text-[#28624f] shadow-sm backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3b8b70] opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3b8b70]" />
            </span>
            ALAT SIAP
          </span>
        </header>

        <section className="relative mt-2 flex flex-1 flex-col overflow-hidden rounded-[2.3rem] border border-white/80 bg-white/90 px-5 pb-5 pt-6 shadow-[0_24px_70px_rgba(48,107,159,0.16)] backdrop-blur sm:px-7">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#e8f5ff]" />
          <div className="pointer-events-none absolute -left-8 top-[42%] h-24 w-24 rounded-full bg-[#fff0f6]" />

          {error ? (
            <div className="m-auto max-w-sm text-center">
              <Activity className="mx-auto mb-5 text-[var(--blue)]" size={48} />
              <h1 className="text-3xl font-black">Koneksi alat terganggu</h1>
              <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
                {error}. Sistem akan mencoba terhubung kembali otomatis.
              </p>
            </div>
          ) : !state ? (
            <div className="m-auto text-center">
              <LoaderCircle
                className="mx-auto mb-5 animate-spin text-[var(--blue)]"
                size={48}
              />
              <h1 className="text-3xl font-black">Sebentar ya…</h1>
              <p className="mt-3 text-[var(--muted-foreground)]">
                Mimo sedang menyiapkan alat.
              </p>
            </div>
          ) : (
            <>
              <div className="relative z-10 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#e5f3ff] px-4 py-2 text-[11px] font-black tracking-[0.14em] text-[#2f6f9f]">
                  <Sparkles size={15} /> HAI, TEMAN!
                </span>
                <h1 className="mx-auto mt-3 max-w-md text-[2.25rem] font-black leading-[0.98] tracking-[-0.045em] sm:text-[2.75rem]">
                  Mimo siap menemani
                  <span className="block text-[#b43e70]">
                    cek tumbuh kembangmu
                  </span>
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
                  Santai saja. Kita cuma punya tiga misi kecil.
                </p>
              </div>

              <div className="relative z-10 mx-auto mt-1 flex min-h-[190px] w-full items-center justify-center sm:min-h-[215px]">
                <span className="pointer-events-none absolute left-[13%] top-[24%] rotate-[-13deg] rounded-full bg-[#fff0f6] px-3 py-2 text-xs font-black text-[#a43f6a] shadow-sm">
                  gampang kok!
                </span>
                <span className="pointer-events-none absolute right-[11%] top-[12%] rotate-[10deg] text-[#f1a9c2]">
                  <WandSparkles size={28} />
                </span>
                <div className="w-[205px] sm:w-[225px]">
                  <Mascot interactive />
                </div>
              </div>

              <div className="relative z-10">
                <div className="mb-2 flex items-center justify-between px-1">
                  <strong className="text-sm">3 misi bareng Mimo</strong>
                  <small className="text-xs font-bold text-[var(--muted-foreground)]">
                    cepat & sederhana
                  </small>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {STEPS.map((step, index) => (
                    <div
                      key={step.label}
                      className="relative rounded-2xl border border-white bg-white/95 px-2 py-3 text-center shadow-[0_7px_20px_rgba(48,107,159,0.08)]"
                    >
                      <span className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[#203b57] text-[10px] font-black text-white">
                        {index + 1}
                      </span>
                      <span
                        className={`mx-auto grid h-11 w-11 place-items-center rounded-2xl ${step.accent}`}
                      >
                        <step.icon size={21} strokeWidth={2.3} />
                      </span>
                      <strong className="mt-2 block text-sm">
                        {step.label}
                      </strong>
                      <small className="mt-0.5 block text-[10px] font-bold leading-4 text-[var(--muted-foreground)] sm:text-[11px]">
                        {step.caption}
                      </small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-3 rounded-2xl bg-[#f5f9fd] px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2 text-xs font-black tracking-[0.04em] text-[#45647f]">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--blue)] opacity-35" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--blue)]" />
                  </span>
                  MENUNGGU PETUGAS MEMILIH ANAK
                </div>
                <p
                  key={tipIndex}
                  className="mt-1.5 text-xs font-semibold leading-5 text-[var(--muted-foreground)] animate-in fade-in duration-500 sm:text-sm"
                >
                  {WAITING_TIPS[tipIndex]}
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
