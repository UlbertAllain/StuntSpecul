"use client";
import { Check, Ruler, Scale, Footprints } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useCountdown } from "@/hooks/use-countdown";
import type { MeasurementPhase } from "@/lib/session";
import { Mascot } from "./mascot";
import { CountdownCue } from "./countdown-cue";
const instructions = {
  prepare: {
    title: "Naik ke alat dulu.",
    subtitle: "Lepas alas kaki. Aku tunggu di sini.",
    label: "BERSIAP",
    icon: Footprints,
  },
  height: {
    title: "Tegak seperti aku.",
    subtitle: "Kaki rapat. Lihat lurus ke depan.",
    label: "TINGGI BADAN",
    icon: Ruler,
  },
  weight: {
    title: "Main patung-patungan!",
    subtitle: "Sekarang, diam sebentar…",
    label: "BERAT BADAN",
    icon: Scale,
  },
};
export function ExaminationStage({
  phase,
  paused,
  onComplete,
  reading,
  soundEnabled = false,
}: {
  phase: MeasurementPhase;
  paused: boolean;
  onComplete: () => void;
  reading?: number | null;
  soundEnabled?: boolean;
}) {
  const remaining = useCountdown(7, paused, onComplete);
  const finished = phase !== "prepare" && remaining <= 1;
  const progress = Math.min(100, ((7 - remaining) / 5) * 100);
  const item = instructions[phase];
  return (
    <section
      className={`examination-screen phase-${phase} ${finished ? "reading-done" : ""}`}
    >
      <div className="screen-heading">
        <span className="stage-kicker">
          <item.icon size={18} />
          {item.label}
        </span>
        <h1>{finished ? "Terima kasih!" : item.title}</h1>
        <p>
          {finished ? "Kamu sudah melakukannya dengan baik." : item.subtitle}
        </p>
      </div>
      <div className="measurement-scene">
        <Mascot pose={finished ? "cheer" : "stand"} />
        {phase === "height" && (
          <div className="height-meter" aria-hidden="true">
            <div style={{ height: `${progress}%` }} />
            <span>cm</span>
          </div>
        )}
        {phase === "weight" && (
          <div className="weight-platform">
            <span>{finished ? <Check size={25} /> : <Scale size={25} />}</span>
            <div>
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="instruction-sticker">
          {phase === "prepare"
            ? "Kaki di tengah, ya."
            : phase === "height"
              ? "Kepala lurus!"
              : "Ssst… jangan bergerak."}
        </div>
      </div>
      <div className="measurement-readout" aria-live="polite">
        {phase === "prepare" ? (
          <>
            <strong role="timer">{paused ? "Ⅱ" : remaining}</strong>
            <span>{paused ? "Kita jeda dulu." : "Bersiap mengukur"}</span>
          </>
        ) : (
          <>
            <strong>
              {finished && reading !== null && reading !== undefined
                ? reading.toFixed(1)
                : finished
                  ? "—"
                  : "···"}
              <small>{phase === "height" ? "cm" : "kg"}</small>
            </strong>
            <span>
              {finished
                ? reading !== null && reading !== undefined
                  ? "Data demo sementara"
                  : "Sensor belum terhubung"
                : paused
                  ? "Pengukuran dijeda"
                  : "Tahan posisi sebentar"}
            </span>
          </>
        )}
      </div>
      {phase !== "prepare" && !finished && (
        <CountdownCue
          remaining={remaining}
          paused={paused}
          soundEnabled={soundEnabled}
        />
      )}
      <Progress
        className="measurement-progress"
        value={phase === "prepare" ? ((7 - remaining) / 7) * 100 : progress}
        aria-label="Progres tahap pemeriksaan"
      />
    </section>
  );
}
