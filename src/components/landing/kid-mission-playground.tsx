"use client";

import Image from "next/image";
import { Camera, Ruler, Scale } from "lucide-react";
import { useMemo, useState } from "react";

const MISSIONS = [
  {
    id: "height",
    label: "Tinggi",
    instruction: "Berdiri tegak",
    cheer: "Wah, siap jadi setinggi jerapah?",
    color: "#72B8E6",
    soft: "#DDF2FF",
    icon: Ruler,
    image: "/images/mimo-stand.png",
  },
  {
    id: "weight",
    label: "Berat",
    instruction: "Diam sebentar",
    cheer: "Hebat! Diam sebentar seperti patung.",
    color: "#FF8EB8",
    soft: "#FFE3EE",
    icon: Scale,
    image: "/images/mimo-cheer.png",
  },
  {
    id: "camera",
    label: "Wajah",
    instruction: "Lihat ke kamera",
    cheer: "Senyum kecil boleh, yang penting lihat ke depan!",
    color: "#F2B84B",
    soft: "#FFF0C8",
    icon: Camera,
    image: "/images/mimo-stand.png",
  },
] as const;

const MIMO_REACTIONS = [
  "Hai! Aku Mimo 👋",
  "Kita cek bareng, ya!",
  "Gampang kok!",
  "Kamu hebat!",
] as const;

export function KidMissionPlayground() {
  const [activeId, setActiveId] =
    useState<(typeof MISSIONS)[number]["id"]>("height");
  const [reactionIndex, setReactionIndex] = useState(0);

  const activeMission = useMemo(
    () => MISSIONS.find((mission) => mission.id === activeId) ?? MISSIONS[0],
    [activeId],
  );

  function reactToTap() {
    setReactionIndex((current) => (current + 1) % MIMO_REACTIONS.length);
  }

  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div
        className="absolute -left-3 top-20 h-16 w-16 rotate-12 rounded-[35%_65%_58%_42%] bg-[#ffd55e] opacity-90"
        aria-hidden="true"
      />
      <div
        className="absolute -right-4 top-8 h-20 w-20 -rotate-12 rounded-[62%_38%_47%_53%] bg-[#ffb4d0] opacity-90"
        aria-hidden="true"
      />
      <div
        className="absolute -right-1 bottom-24 h-14 w-14 rotate-6 rounded-full border-[5px] border-[#80c7ec]"
        aria-hidden="true"
      />

      <div className="relative overflow-hidden rounded-[3rem_3rem_2rem_2rem] border-[4px] border-[#18334d] bg-[#fffdf5] shadow-[10px_12px_0_#18334d]">
        <div className="flex items-center justify-between border-b-[3px] border-[#18334d] bg-[#bfe7ff] px-5 py-4">
          <div>
            <span className="block text-[11px] font-black uppercase tracking-[0.15em] text-[#32688f]">
              Misi bersama Mimo
            </span>
            <strong className="mt-1 block text-lg font-black text-[#18334d]">
              Pilih satu, yuk!
            </strong>
          </div>

          <div className="flex gap-1.5" aria-label="Progress tiga tahap">
            {MISSIONS.map((mission) => (
              <span
                key={mission.id}
                className="h-3 w-3 rounded-full border-2 border-[#18334d]"
                style={{
                  background:
                    mission.id === activeMission.id ? mission.color : "#ffffff",
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative min-h-[380px] overflow-hidden px-5 pb-4 pt-6 text-center sm:px-8">
          <div
            className="absolute left-8 top-9 h-5 w-5 rotate-12 bg-[#ffd55e]"
            aria-hidden="true"
            style={{ clipPath: "polygon(50% 0,61% 36%,100% 50%,61% 64%,50% 100%,39% 64%,0 50%,39% 36%)" }}
          />
          <div
            className="absolute right-9 top-28 h-4 w-16 rotate-[-12deg] rounded-full bg-[#9edaf8]"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-9 left-9 h-10 w-10 rounded-full border-[4px] border-[#ff9fc2]"
            aria-hidden="true"
          />

          <div
            className="mx-auto w-fit -rotate-2 rounded-[1.4rem_1.4rem_1.4rem_.4rem] border-[3px] border-[#18334d] bg-white px-5 py-3 shadow-[4px_5px_0_#18334d]"
          >
            <p className="text-sm font-black text-[#18334d]">
              {activeMission.cheer}
            </p>
          </div>

          <button
            type="button"
            onClick={reactToTap}
            className="group relative mx-auto mt-4 block"
            aria-label="Sapa Mimo"
          >
            <span
              className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: activeMission.soft }}
              aria-hidden="true"
            />
            <Image
              src={activeMission.image}
              alt="Mimo, teman pemeriksaan StuntSpecula"
              width={800}
              height={800}
              className="relative z-10 mx-auto h-52 w-52 object-contain transition duration-200 group-hover:-rotate-2 group-hover:scale-105 group-active:scale-95 sm:h-60 sm:w-60"
              priority
            />
            <span className="absolute bottom-3 right-1 z-20 rotate-3 rounded-full border-[3px] border-[#18334d] bg-[#fff4a8] px-3 py-1.5 text-[11px] font-black text-[#18334d] shadow-[3px_3px_0_#18334d]">
              tap Mimo!
            </span>
          </button>

          <p
            key={reactionIndex}
            className="mx-auto mt-1 min-h-6 text-sm font-black text-[#b43e70]"
          >
            {MIMO_REACTIONS[reactionIndex]}
          </p>
        </div>

        <div className="grid gap-3 border-t-[3px] border-[#18334d] bg-white p-4 sm:grid-cols-3">
          {MISSIONS.map((mission) => {
            const Icon = mission.icon;
            const selected = mission.id === activeMission.id;

            return (
              <button
                key={mission.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveId(mission.id)}
                className="relative min-h-28 rounded-[1.6rem] border-[3px] border-[#18334d] px-4 py-4 text-left transition hover:-translate-y-1 active:translate-y-0"
                style={{
                  background: selected ? mission.soft : "#fffdf7",
                  boxShadow: selected ? "5px 6px 0 #18334d" : "none",
                }}
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#18334d]"
                  style={{ background: mission.color }}
                >
                  <Icon size={19} strokeWidth={3} />
                </span>
                <strong className="mt-3 block text-base font-black text-[#18334d]">
                  {mission.label}
                </strong>
                <span className="mt-1 block text-xs font-bold text-[#5b7182]">
                  {mission.instruction}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
