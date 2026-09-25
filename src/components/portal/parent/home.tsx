"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  History,
  Play,
  TrendingUp,
} from "lucide-react";
import { growthStatusLabel } from "@/lib/growth";
import type { Examination, ParentAccountView } from "@/lib/portal";
import { ageInMonths } from "@/lib/portal";
import { facialAnalysisLabel, formatAge, formatReading } from "@/lib/screening";

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

function examDate(exam: Examination) {
  return new Date(exam.completedAt || exam.createdAt).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
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
  const [showAllHistory, setShowAllHistory] = useState(false);
  const child = view.children[0];
  const history = useMemo(
    () => view.examinations.filter((exam) => exam.status === "completed"),
    [view.examinations],
  );
  const visibleHistory = showAllHistory ? history : history.slice(0, 3);

  return (
    <div className="parent-home-dashboard">
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

      <section className="mobile-dashboard-card parent-home-latest-result">
        <div className="simple-card-title">
          <TrendingUp size={19} />
          <div>
            <h3>Hasil terbaru</h3>
            <p>
              {latest
                ? `Pemeriksaan ${examDate(latest)}`
                : "Belum ada pemeriksaan tersimpan."}
            </p>
          </div>
        </div>

        {latest ? (
          <>
            <div className="parent-home-result-status">
              <span>HASIL PERTUMBUHAN WHO</span>
              <strong>{growthStatusLabel(latest.growthStatus)}</strong>
              <small>
                TB/U {formatReading(latest.heightForAgeZ)} SD · Model A{" "}
                {facialAnalysisLabel(latest.facialStatus)}
              </small>
            </div>
            <Link
              className="parent-home-result-link"
              href={`/ortu/riwayat/${encodeURIComponent(latest.id)}`}
            >
              Lihat hasil, rekomendasi, dan tindak lanjut
              <ChevronRight size={17} />
            </Link>
          </>
        ) : (
          <p className="portal-note parent-home-empty-copy">
            Hasil pertama akan muncul setelah pemeriksaan selesai.
          </p>
        )}
      </section>

      <section className="parent-home-history">
        <div className="parent-home-history-heading">
          <div>
            <span className="parent-section-eyebrow">RIWAYAT</span>
            <h2>Pemeriksaan sebelumnya</h2>
            <p>
              Hasil lama tetap tersimpan dan bisa dibuka kembali kapan saja.
            </p>
          </div>
          <History size={22} />
        </div>

        {history.length === 0 ? (
          <div className="portal-empty parent-home-history-empty">
            <h3>Belum ada riwayat</h3>
            <p>Riwayat akan terisi otomatis setelah pemeriksaan selesai.</p>
          </div>
        ) : (
          <>
            <div className="parent-home-history-list">
              {visibleHistory.map((exam) => (
                <Link
                  key={exam.id}
                  className="parent-home-history-item"
                  href={`/ortu/riwayat/${encodeURIComponent(exam.id)}`}
                >
                  <span className="parent-home-history-date">
                    <CalendarDays size={16} />
                    {examDate(exam)}
                  </span>
                  <strong>{growthStatusLabel(exam.growthStatus)}</strong>
                  <div>
                    <span>{formatReading(exam.heightCm)} cm</span>
                    <span>{formatReading(exam.weightKg)} kg</span>
                    <ChevronRight size={17} />
                  </div>
                </Link>
              ))}
            </div>

            {history.length > 3 && (
              <button
                type="button"
                className="parent-home-history-toggle"
                onClick={() => setShowAllHistory((value) => !value)}
              >
                {showAllHistory ? (
                  <>
                    Tampilkan lebih sedikit <ChevronUp size={16} />
                  </>
                ) : (
                  <>
                    Lihat semua {history.length} pemeriksaan{" "}
                    <ChevronDown size={16} />
                  </>
                )}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
