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
    background: "#DDF2FF",
    accent: "#72B8E6",
  },
  {
    label: "Berat",
    caption: "Diam sebentar",
    icon: Scale,
    background: "#FFE3EE",
    accent: "#FF8EB8",
  },
  {
    label: "Wajah",
    caption: "Lihat kamera",
    icon: Camera,
    background: "#FFF0C8",
    accent: "#F2B84B",
  },
] as const;

const WAITING_TIPS = [
  "Nanti cukup berdiri tegak dan santai, ya.",
  "Mimo akan menemani sampai pemeriksaan selesai.",
  "Tinggi, berat, lalu lihat kamera. Gampang!",
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
      3600,
    );
    return () => clearInterval(timer);
  }, [error, loading]);

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#CDEBFF] px-4 py-4 text-[#18334d] sm:px-6">
      <span
        className="pointer-events-none absolute left-[7%] top-[15%] h-9 w-9 rotate-12 bg-[#FFD55E]"
        style={{
          clipPath:
            "polygon(50% 0,61% 36%,100% 50%,61% 64%,50% 100%,39% 64%,0 50%,39% 36%)",
        }}
      />
      <span className="pointer-events-none absolute right-[7%] top-[22%] h-14 w-14 -rotate-12 rounded-[58%_42%_62%_38%] bg-[#FFB4D0]" />
      <span className="pointer-events-none absolute bottom-[8%] left-[5%] h-12 w-12 rounded-full border-[5px] border-[#4E8BC4]" />

      <div className="relative mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-[590px] flex-col">
        <header className="flex items-center justify-between gap-4 py-1">
          <Image
            src="/images/stuntspecula-logo.jpeg"
            alt="StuntSpecula"
            width={1536}
            height={1024}
            className="h-14 w-36 object-contain mix-blend-multiply sm:h-16 sm:w-40"
            priority
          />
          <span className="inline-flex items-center gap-2 rounded-full border-[2.5px] border-[#18334d] bg-[#DFF3E8] px-3 py-2 text-[11px] font-black tracking-[0.08em] shadow-[3px_3px_0_#18334d]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3b8b70] opacity-45" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#3b8b70]" />
            </span>
            ALAT SIAP
          </span>
        </header>

        <section className="relative mt-2 flex flex-1 flex-col overflow-hidden rounded-[2.8rem_2.8rem_2rem_2rem] border-[4px] border-[#18334d] bg-[#FFFDF7] px-5 pb-5 pt-6 shadow-[8px_10px_0_#18334d] sm:px-7">
          {error ? (
            <div className="m-auto max-w-sm text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border-[3px] border-[#18334d] bg-[#FFE3EE] shadow-[3px_4px_0_#18334d]">
                <Activity size={30} />
              </span>
              <h1 className="mt-6 text-3xl font-black">
                Koneksi alat terganggu
              </h1>
              <p className="mt-4 font-semibold leading-7 text-[#5d7384]">
                {error}. Sistem akan mencoba terhubung kembali otomatis.
              </p>
            </div>
          ) : loading ? (
            <div className="m-auto text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border-[3px] border-[#18334d] bg-[#FFF0C8] shadow-[3px_4px_0_#18334d]">
                <LoaderCircle className="animate-spin" size={30} />
              </span>
              <h1 className="mt-6 text-3xl font-black">Sebentar ya…</h1>
              <p className="mt-3 font-semibold text-[#5d7384]">
                Mimo sedang menyiapkan alat.
              </p>
            </div>
          ) : (
            <>
              <div className="relative z-10 flex w-full flex-col items-center text-center">
                <span className="-rotate-2 rounded-[1rem_1rem_1rem_.3rem] border-[2.5px] border-[#18334d] bg-white px-4 py-2 text-[11px] font-black tracking-[0.08em] shadow-[3px_3px_0_#18334d]">
                  HALO, AKU MIMO! 👋
                </span>
                <h1 className="mx-auto mt-4 w-full max-w-md text-[2.35rem] font-black leading-[.96] tracking-[-0.045em] sm:text-[2.85rem]">
                  Yuk, cek{" "}
                  <span className="relative inline-block text-[#B43E70]">
                    tumbuh kembangmu
                    <span className="absolute -bottom-1 left-1 right-1 h-2 -rotate-1 rounded-full bg-[#FFD55E]" />
                  </span>
                </h1>
                <p className="mx-auto mt-4 max-w-sm text-center text-sm font-semibold leading-6 text-[#5b7182] sm:text-base">
                  Santai saja, ya. Cuma tiga misi kecil bersama Mimo.
                </p>
              </div>

              <div className="relative z-10 mx-auto mt-1 flex min-h-[205px] w-full items-center justify-center sm:min-h-[225px]">
                <span className="pointer-events-none absolute left-[7%] top-[24%] rotate-[-8deg] rounded-[1rem_1rem_1rem_.25rem] border-2 border-[#18334d] bg-[#FFE3EE] px-3 py-2 text-xs font-black shadow-[2px_3px_0_#18334d]">
                  gampang kok!
                </span>
                <div className="w-[215px] sm:w-[235px]">
                  <Mascot interactive />
                </div>
              </div>

              <div className="relative z-10">
                <div className="mb-3 flex items-end justify-between gap-3 px-1">
                  <div>
                    <strong className="block text-base font-black">
                      Tiga misi kecil
                    </strong>
                    <small className="mt-0.5 block text-xs font-bold text-[#657d8f]">
                      Tinggal ikuti Mimo
                    </small>
                  </div>
                  <span className="rotate-2 rounded-full bg-[#DFF3E8] px-3 py-1.5 text-[10px] font-black">
                    cepat & sederhana
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {STEPS.map((step, index) => (
                    <div
                      key={step.label}
                      className="relative min-h-[120px] rounded-[1.6rem] border-[2.5px] border-[#18334d] px-2 py-3 text-center"
                      style={{
                        background: step.background,
                        transform: `rotate(${index === 1 ? "1.5deg" : "-1deg"})`,
                        boxShadow: "3px 4px 0 #18334d",
                      }}
                    >
                      <span
                        className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-full border border-[#18334d] text-[10px] font-black"
                        style={{ background: step.accent }}
                      >
                        {index + 1}
                      </span>
                      <span
                        className="mx-auto grid h-11 w-11 place-items-center rounded-full border-2 border-[#18334d]"
                        style={{ background: step.accent }}
                      >
                        <step.icon size={20} strokeWidth={2.8} />
                      </span>
                      <strong className="mt-2 block text-sm font-black">
                        {step.label}
                      </strong>
                      <small className="mt-0.5 block text-[10px] font-bold leading-4 text-[#5d7384] sm:text-[11px]">
                        {step.caption}
                      </small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-4 rounded-[1.35rem] border-[2.5px] border-[#18334d] bg-white px-4 py-3 text-center shadow-[3px_4px_0_#9ed7f5]">
                <div className="flex items-center justify-center gap-2 text-xs font-black tracking-[0.04em]">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4E8BC4] opacity-35" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#4E8BC4]" />
                  </span>
                  MENUNGGU PETUGAS MEMILIH ANAK
                </div>
                <p
                  key={tipIndex}
                  className="mt-1.5 animate-in text-center text-xs font-semibold leading-5 text-[#63798a] fade-in duration-500 sm:text-sm"
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
