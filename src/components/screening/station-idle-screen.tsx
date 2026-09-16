"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Activity, Camera, LoaderCircle, Ruler, Scale } from "lucide-react";
import { Mascot } from "./mascot";

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

export function StationIdleScreen({
  error,
  loading,
}: {
  error: string;
  loading: boolean;
}) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (error || loading) return;
    const timer = setInterval(
      () => setTipIndex((index) => (index + 1) % WAITING_TIPS.length),
      3800,
    );
    return () => clearInterval(timer);
  }, [error, loading]);

  return (
    <main className="relative min-h-svh overflow-hidden bg-[linear-gradient(180deg,#d8efff_0%,#c5e4ff_58%,#ffe3ed_100%)] px-4 py-4 text-[var(--ink)] sm:px-6">
      <div className="pointer-events-none absolute -left-16 top-24 h-48 w-48 rounded-full bg-white/45 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-16 h-56 w-56 rounded-full bg-white/45 blur-3xl" />

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
          <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-[11px] font-black tracking-[0.08em] text-[#28624f] shadow-sm backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3b8b70] opacity-45" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3b8b70]" />
            </span>
            ALAT SIAP
          </span>
        </header>

        <section className="relative mt-2 flex flex-1 flex-col overflow-hidden rounded-[2.3rem] border border-white/80 bg-white/92 px-5 pb-5 pt-6 shadow-[0_24px_70px_rgba(48,107,159,0.14)] backdrop-blur sm:px-7">
          {error ? (
            <div className="m-auto max-w-sm text-center">
              <Activity className="mx-auto mb-5 text-[var(--blue)]" size={48} />
              <h1 className="text-3xl font-black">Koneksi alat terganggu</h1>
              <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
                {error}. Sistem akan mencoba terhubung kembali otomatis.
              </p>
            </div>
          ) : loading ? (
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
                <span className="inline-flex rounded-full bg-[#e5f3ff] px-4 py-2 text-[11px] font-black tracking-[0.14em] text-[#2f6f9f]">
                  HALO, AKU MIMO!
                </span>
                <h1 className="mx-auto mt-3 max-w-md text-[2.25rem] font-black leading-[0.98] tracking-[-0.045em] sm:text-[2.75rem]">
                  Yuk, cek
                  <span className="block text-[#b43e70]">tumbuh kembangmu</span>
                </h1>
                <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
                  Santai saja, ya.
                  <span className="block">
                    Tiga langkah sederhana bersama Mimo.
                  </span>
                </p>
              </div>

              <div className="relative z-10 mx-auto mt-1 flex min-h-[195px] w-full items-center justify-center sm:min-h-[220px]">
                <span className="pointer-events-none absolute left-[11%] top-[25%] rotate-[-8deg] rounded-full bg-[#fff0f6] px-3 py-2 text-xs font-black text-[#a43f6a] shadow-sm">
                  gampang kok!
                </span>
                <div className="w-[210px] sm:w-[230px]">
                  <Mascot interactive />
                </div>
              </div>

              <div className="relative z-10">
                <div className="mb-2 flex items-center justify-between px-1">
                  <strong className="text-sm">3 langkah pemeriksaan</strong>
                  <small className="text-xs font-bold text-[var(--muted-foreground)]">
                    cepat & sederhana
                  </small>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {STEPS.map((step, index) => (
                    <div
                      key={step.label}
                      className="relative rounded-2xl border border-[#e3edf6] bg-white px-2 py-3 text-center shadow-[0_7px_20px_rgba(48,107,159,0.07)]"
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
                  className="mt-1.5 animate-in text-xs font-semibold leading-5 text-[var(--muted-foreground)] fade-in duration-500 sm:text-sm"
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
