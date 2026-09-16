"use client";

import { CheckCircle2 } from "lucide-react";
import { Mascot } from "./mascot";

export function StationCompleteScreen() {
  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-[linear-gradient(180deg,#d9efff_0%,#c7e5ff_48%,#ffe6ef_100%)] p-5 text-[var(--ink)]">
      <div className="pointer-events-none absolute -left-16 top-16 h-44 w-44 rounded-full bg-white/45 blur-2xl" />
      <div className="pointer-events-none absolute -right-20 bottom-8 h-56 w-56 rounded-full bg-white/55 blur-2xl" />

      <section className="relative w-full max-w-[550px] overflow-hidden rounded-[2.4rem] border border-white/80 bg-white/95 px-7 py-7 text-center shadow-[0_24px_70px_rgba(48,107,159,0.16)] backdrop-blur sm:px-9">
        <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#eef8f4] px-4 py-2 text-xs font-extrabold tracking-[0.1em] text-[#27644f]">
          <CheckCircle2 size={16} /> PEMERIKSAAN SELESAI
        </span>

        <div className="mx-auto mt-4 w-[210px] sm:w-[230px]">
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
          Menunggu petugas menyelesaikan sesi
        </div>
      </section>
    </main>
  );
}
