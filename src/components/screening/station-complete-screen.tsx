"use client";

import { CheckCircle2, Star } from "lucide-react";
import { Mascot } from "./mascot";

export function StationCompleteScreen() {
  return (
    <main className="station-complete-shell relative grid min-h-svh place-items-center overflow-hidden bg-[#CDEBFF] p-5 text-[#18334d]">
      <span className="pointer-events-none absolute left-[8%] top-[12%] h-16 w-16 rotate-12 rounded-[60%_40%_55%_45%] bg-[#FFB4D0]" />
      <span className="pointer-events-none absolute right-[8%] top-[15%] h-12 w-12 rounded-full bg-[#FFD55E]" />
      <Star
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[10%] left-[10%] rotate-[-10deg] fill-[#FFF0A8] text-[#18334d]"
        size={42}
        strokeWidth={2.5}
      />

      <section className="station-complete-card relative w-full max-w-[560px] overflow-hidden rounded-[3rem_3rem_2rem_2rem] border-[4px] border-[#18334d] bg-[#FFFDF7] px-7 py-7 text-center shadow-[9px_11px_0_#18334d] sm:px-9">
        <span className="mx-auto inline-flex -rotate-1 items-center gap-2 rounded-full border-[2.5px] border-[#18334d] bg-[#DFF3E8] px-4 py-2 text-xs font-black tracking-[0.08em] shadow-[3px_3px_0_#18334d]">
          <CheckCircle2 size={16} strokeWidth={3} /> PEMERIKSAAN SELESAI
        </span>

        <div className="relative mx-auto mt-3 w-[220px] sm:w-[240px]">
          <span className="pointer-events-none absolute inset-[18%] rounded-full bg-[#FFE3EE]" />
          <div className="relative">
            <Mascot pose="cheer" interactive interaction="high-five" />
          </div>
        </div>

        <h1 className="mx-auto mt-1 max-w-md text-4xl font-black leading-[.98] tracking-[-0.045em] sm:text-5xl">
          Yeay, kamu hebat!
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base font-semibold leading-7 text-[#5c7384] sm:text-lg">
          Semua misi sudah selesai. Sekarang boleh turun dari alat dan istirahat
          sebentar.
        </p>

        <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-[1.4rem] border-[2.5px] border-[#18334d] bg-[#FFF0C8] px-4 py-3 text-sm font-black shadow-[3px_4px_0_#18334d]">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4E8BC4] opacity-45" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#4E8BC4]" />
          </span>
          Menunggu orang tua menyelesaikan sesi dari HP
        </div>
      </section>
    </main>
  );
}
