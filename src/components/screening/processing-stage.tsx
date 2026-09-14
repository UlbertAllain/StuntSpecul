"use client";

import { Eye, Ruler, ScanFace } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useCountdown } from "@/hooks/use-countdown";
import { Mascot } from "./mascot";

const ANALYSIS_STEPS = [
  { label: "Area mata & kantong mata", icon: Eye },
  { label: "Kondisi bibir", icon: ScanFace },
  { label: "Data tubuh & acuan WHO", icon: Ruler },
];

export function ProcessingStage({
  paused,
  onComplete,
}: {
  paused: boolean;
  onComplete: () => void;
}) {
  const remaining = useCountdown(6, paused, onComplete);
  const activeIndex = remaining > 4 ? 0 : remaining > 2 ? 1 : 2;

  return (
    <section className="processing-screen">
      <div className="screen-heading">
        <span className="stage-kicker">MENYIAPKAN HASIL</span>
        <h1>
          Terima kasih,
          <br />
          sudah hebat!
        </h1>
        <p>Sekarang boleh santai sebentar.</p>
      </div>
      <Mascot pose="cheer" interactive />
      <div className="processing-list">
        {ANALYSIS_STEPS.map((step, index) => (
          <div
            className={index === activeIndex ? "active" : ""}
            key={step.label}
          >
            <step.icon size={22} />
            <span>
              {step.label}
              <small>Layanan penilaian belum tersedia</small>
            </span>
            <span
              className={
                index === activeIndex ? "loading-ring" : "pending-mark"
              }
            />
          </div>
        ))}
      </div>
      <Progress
        value={((6 - remaining) / 6) * 100}
        aria-label="Progres penyusunan laporan"
      />
    </section>
  );
}
