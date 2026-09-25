"use client";

import Image from "next/image";
import { Activity, Camera, LoaderCircle, Ruler, Scale } from "lucide-react";
import { Mascot } from "./mascot";

const STEPS = [
  { label: "Tinggi", icon: Ruler, background: "#DDF2FF" },
  { label: "Berat", icon: Scale, background: "#FFE3EE" },
  { label: "Wajah", icon: Camera, background: "#FFF0C8" },
] as const;

export function StationIdleScreen({
  error,
  loading,
}: {
  error: string;
  loading: boolean;
}) {
  return (
    <main className="station-idle-shell min-h-svh bg-[linear-gradient(180deg,#DDF2FF_0%,#FFFDF7_48%,#FFF7FA_100%)] px-4 py-4 text-[#18334d] sm:px-6">
      <div className="station-idle-frame mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-[560px] flex-col">
        <header className="station-idle-header flex items-center justify-between gap-3 py-1">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            className="h-12 w-32 object-contain mix-blend-multiply sm:h-14 sm:w-36"
            priority
          />
          <span className="inline-flex items-center gap-2 rounded-full border border-[#b8d4c7] bg-[#eef9f3] px-3 py-2 text-[11px] font-extrabold tracking-[0.06em] text-[#315f4e]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4f9a76]" />
            ALAT SIAP
          </span>
        </header>

        <section className="station-idle-card mt-3 flex flex-1 flex-col rounded-[2rem] border-2 border-[#18334d] bg-[#FFFDF7] px-5 py-6 shadow-[0_14px_34px_rgba(24,51,77,0.12)] sm:px-7">
          {error ? (
            <div className="m-auto max-w-sm text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFE3EE]">
                <Activity size={27} />
              </span>
              <h1 className="mt-5 text-2xl font-black">
                Koneksi alat terganggu
              </h1>
              <p className="mt-3 font-semibold leading-6 text-[#5d7384]">
                {error}. Sistem akan mencoba terhubung kembali otomatis.
              </p>
            </div>
          ) : loading ? (
            <div className="m-auto text-center">
              <LoaderCircle
                className="mx-auto animate-spin text-[#4E8BC4]"
                size={38}
              />
              <h1 className="mt-4 text-2xl font-black">Sebentar ya…</h1>
              <p className="mt-2 font-semibold text-[#5d7384]">
                Mimo sedang menyiapkan alat.
              </p>
            </div>
          ) : (
            <>
              <div className="station-idle-body">
                <div className="text-center">
                  <span className="inline-flex rounded-full bg-[#E8F5FF] px-3 py-1.5 text-[11px] font-black tracking-[0.08em] text-[#315f80]">
                    HALO, AKU MIMO!
                  </span>
                  <h1 className="mx-auto mt-4 max-w-md text-[2.2rem] font-black leading-[0.98] tracking-[-0.045em] sm:text-[2.7rem]">
                    Yuk, cek{" "}
                    <span className="text-[#B43E70]">tumbuh kembangmu</span>
                  </h1>
                  <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-[#5d7384]">
                    Cuma tiga langkah singkat. Ikuti petunjuk Mimo sampai
                    selesai.
                  </p>
                </div>

                <div className="station-idle-mascot mx-auto mt-2 w-[175px] sm:w-[195px]">
                  <Mascot interactive />
                </div>

                <div className="station-idle-steps mt-2 grid grid-cols-3 gap-2">
                  {STEPS.map((step, index) => (
                    <div
                      key={step.label}
                      className="rounded-2xl border border-[#cbd8e1] px-2 py-3 text-center"
                      style={{ background: step.background }}
                    >
                      <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-white/80">
                        <step.icon size={18} strokeWidth={2.6} />
                      </span>
                      <strong className="mt-2 block text-xs font-black">
                        {index + 1}. {step.label}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="station-idle-status mt-auto pt-5">
                <div className="rounded-2xl border border-[#cbd8e1] bg-white px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-black tracking-[0.04em]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#4E8BC4]" />
                    MENUNGGU ORANG TUA MEMULAI
                  </div>
                  <p className="mt-1.5 text-xs font-semibold leading-5 text-[#63798a] sm:text-sm">
                    Mulai pemeriksaan dari HP orang tua. Setelah itu Mimo akan
                    memandu anak di alat.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
