"use client";
import { Check, Ruler, Scale, Footprints } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useCountdown } from "@/hooks/use-countdown";
import { playMimoStageDoneCue } from "@/lib/mimo-audio";
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
  sensorOnline = false,
  sensorHealth = "unknown",
  measurementUpdatedAt = null,
}: {
  phase: MeasurementPhase;
  paused: boolean;
  onComplete: () => void;
  reading?: number | null;
  soundEnabled?: boolean;
  sensorOnline?: boolean;
  sensorHealth?: "ok" | "error" | "unknown";
  measurementUpdatedAt?: number | null;
}) {
  function finishStage() {
    if (!soundEnabled) {
      onComplete();
      return;
    }

    playMimoStageDoneCue();
    window.setTimeout(onComplete, 180);
  }

  const readingReady =
    phase === "prepare" || (reading !== null && reading !== undefined);
  const remaining = useCountdown(7, paused, finishStage, readingReady);
  const waitingForSensor =
    phase !== "prepare" && remaining === 0 && !readingReady;
  const finished = phase !== "prepare" && remaining === 0 && readingReady;
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
        <h1>
          {finished
            ? "Terima kasih!"
            : waitingForSensor
              ? "Tunggu sebentar…"
              : item.title}
        </h1>
        <p>
          {finished
            ? "Kamu sudah melakukannya dengan baik."
            : waitingForSensor
              ? "Sensor sedang mengambil hasil. Tetap di posisi, ya."
              : item.subtitle}
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
                : waitingForSensor
                  ? "—"
                  : "···"}
              <small>{phase === "height" ? "cm" : "kg"}</small>
            </strong>
            <span>
              {finished
                ? "Data sensor"
                : waitingForSensor
                  ? "Menunggu data sensor"
                  : paused
                    ? "Pengukuran dijeda"
                    : "Tahan posisi sebentar"}
            </span>
          </>
        )}
      </div>
      {phase !== "prepare" && (
        <div
          className={`sensor-receipt ${readingReady ? "received" : ""} ${!sensorOnline ? "offline" : ""}`}
          role="status"
          aria-live="polite"
        >
          <strong>
            {readingReady
              ? "✓ Data sensor diterima"
              : sensorOnline
                ? "● ESP32 terhubung"
                : "○ ESP32 belum terhubung"}
          </strong>
          <span>
            {readingReady
              ? `${phase === "height" ? "Tinggi" : "Berat"} sudah tersimpan di sesi.`
              : sensorHealth === "error"
                ? "Sensor melaporkan error."
                : sensorHealth === "ok"
                  ? "Sensor siap, menunggu hasil pengukuran."
                  : "Menunggu status sensor dari alat."}
          </span>
          <small>
            {measurementUpdatedAt
              ? `Update data terakhir ${new Date(
                  measurementUpdatedAt,
                ).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : "Belum ada measurement yang diterima backend."}
          </small>
        </div>
      )}

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
