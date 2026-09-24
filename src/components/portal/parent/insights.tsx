"use client";

import type { Examination, ParentAccountView } from "@/lib/portal";
import { ParentGrowthInsights } from "./growth-insights";

export function ParentInsights({
  examinations,
  child,
}: {
  examinations: Examination[];
  child: ParentAccountView["children"][number] | null;
}) {
  return (
    <>
      <div className="section-heading parent-insight-heading">
        <div>
          <span className="parent-section-eyebrow">PERTUMBUHAN ANAK</span>
          <h2>Insight pertumbuhan</h2>
          <p className="portal-note">
            Grafik membantu melihat pola tinggi, berat, dan TB/U dari waktu ke
            waktu.
          </p>
        </div>
      </div>
      <ParentGrowthInsights examinations={examinations} child={child} />
    </>
  );
}

