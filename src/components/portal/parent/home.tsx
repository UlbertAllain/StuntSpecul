"use client";

import { Play, TrendingUp } from "lucide-react";
import type { Examination, ParentAccountView } from "@/lib/portal";
import { ageInMonths } from "@/lib/portal";
import { growthStatusLabel } from "@/lib/growth";
import { formatAge, formatReading } from "@/lib/screening";

function MiniGrowthChart({ examinations }: { examinations: Examination[] }) {
  const values = examinations
    .filter((exam) => exam.status === "completed" && exam.heightCm !== null)
    .slice(0, 6)
    .reverse();

  if (values.length < 2) {
    return (
      <div className="parent-mini-chart empty">
        <span>Grafik akan muncul setelah ada beberapa pemeriksaan.</span>
      </div>
    );
  }

  const heights = values.map((exam) => exam.heightCm as number);
  const min = Math.min(...heights) - 2;
  const max = Math.max(...heights) + 2;
  const range = Math.max(1, max - min);
  const points = values
    .map((exam, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 88 - (((exam.heightCm as number) - min) / range) * 70;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="parent-mini-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points={points}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span>Perkembangan tinggi badan</span>
    </div>
  );
}

export function ParentHome({
  view,
  latest,
  activeExam,
  onStart,
}: {
  view: ParentAccountView;
  latest: Examination | null;
  activeExam: Examination | null;
  onStart: () => void;
}) {
  const child = view.children[0];

  return (
    <>
      <section className="mobile-dashboard-card parent-growth-card">
        <div className="parent-dashboard-head">
          <div>
            <span>PROFIL PERTUMBUHAN</span>
            <h2>{child?.name || "Anak"}</h2>
            <p>
              {child
                ? formatAge(ageInMonths(child.birthDate))
                : "Belum ada profil"}
              {child
                ? ` · ${child.sex === "male" ? "Laki-laki" : "Perempuan"}`
                : ""}
            </p>
          </div>
          <span className="parent-dashboard-avatar">
            {child?.name.slice(0, 1).toUpperCase() || "A"}
          </span>
        </div>

        <MiniGrowthChart examinations={view.examinations} />

        <div className="parent-latest-metrics">
          <article>
            <span>Tinggi</span>
            <strong>{formatReading(latest?.heightCm ?? null)}</strong>
            <small>cm</small>
          </article>
          <article>
            <span>Berat</span>
            <strong>{formatReading(latest?.weightKg ?? null)}</strong>
            <small>kg</small>
          </article>
          <article>
            <span>TB/U</span>
            <strong className="metric-status">
              {latest ? growthStatusLabel(latest.growthStatus) : "Belum ada"}
            </strong>
          </article>
        </div>
      </section>

      {activeExam && (
        <button className="simple-session-banner" onClick={onStart}>
          <div>
            <strong>
              {activeExam.status === "completed"
                ? "Hasil sudah siap"
                : "Pemeriksaan sedang aktif"}
            </strong>
            <span>
              {activeExam.status === "completed"
                ? "Selesaikan sesi agar alat siap digunakan kembali."
                : "Buka status sesi pemeriksaan anak."}
            </span>
          </div>
          <Play size={19} />
        </button>
      )}

      <section className="mobile-dashboard-card parent-info-card">
        <div className="simple-card-title">
          <TrendingUp size={19} />
          <div>
            <h3>Ringkasan terbaru</h3>
            <p>
              {latest
                ? "Pemeriksaan " +
                  new Date(
                    latest.completedAt || latest.createdAt,
                  ).toLocaleDateString("id-ID")
                : "Belum ada pemeriksaan tersimpan."}
            </p>
          </div>
        </div>
        {latest && (
          <div className="parent-summary-lines">
            <div>
              <span>Status pertumbuhan</span>
              <strong>{growthStatusLabel(latest.growthStatus)}</strong>
            </div>
            <div>
              <span>Analisis wajah</span>
              <strong>
                {latest.facialStatus
                  ? latest.facialStatus === "stunting_indication"
                    ? "Indikasi pendukung"
                    : latest.facialStatus === "non_stunting_indication"
                      ? "Tidak terindikasi"
                      : "Foto perlu diulang"
                  : "Belum tersedia"}
              </strong>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
