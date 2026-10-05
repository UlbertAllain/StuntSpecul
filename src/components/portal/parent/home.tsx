"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  History,
  Play,
  TrendingUp,
} from "lucide-react";
import { growthStatusLabelForAge } from "@/lib/growth";
import type {
  ChildProfile,
  Examination,
  ParentAccountView,
} from "@/lib/portal";
import { ageInMonths } from "@/lib/portal";
import {
  facialAnalysisLabel,
  formatAge,
  formatReading,
  visualAnalysisStatusLabel,
} from "@/lib/screening";

function MiniGrowthChart({
  examinations,
  isInfant,
}: {
  examinations: Examination[];
  isInfant: boolean;
}) {
  const values = examinations
    .filter(
      (exam) =>
        exam.status === "completed" &&
        exam.measurementQuality !== "recheck" &&
        exam.heightCm !== null &&
        (isInfant ? exam.ageMonths <= 23 : exam.ageMonths >= 24),
    )
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
      <span>
        Perkembangan {isInfant ? "panjang badan" : "tinggi badan"}
      </span>
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
  child,
  examinations,
  latest,
  activeExam,
  onSelectChild,
  onStart,
}: {
  view: ParentAccountView;
  child: ChildProfile | null;
  examinations: Examination[];
  latest: Examination | null;
  activeExam: Examination | null;
  onSelectChild: (childId: string) => void;
  onStart: () => void;
}) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const history = examinations;
  const visibleHistory = showAllHistory ? history : history.slice(0, 3);
  const childAgeMonths = child ? ageInMonths(child.birthDate) : null;
  const isInfant = childAgeMonths !== null && childAgeMonths <= 23;
  const linearIndicator = isInfant ? "PB/U" : "TB/U";
  const linearMeasurementLabel = isInfant ? "Panjang" : "Tinggi";

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

        {view.children.length > 1 && (
          <label className="parent-child-switcher">
            Anak yang ditampilkan
            <select
              value={child?.id || ""}
              onChange={(event) => {
                setShowAllHistory(false);
                onSelectChild(event.target.value);
              }}
            >
              {view.children.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {child?.latestFacePhotoUrl && (
          <div className="parent-latest-face">
            <div>
              <span>FOTO PEMERIKSAAN TERAKHIR</span>
              <small>
                {child.latestFacePhotoUpdatedAt
                  ? new Date(child.latestFacePhotoUpdatedAt).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )
                  : "Foto terbaru"}
              </small>
            </div>
            <Image
              src={child.latestFacePhotoUrl}
              alt={`Foto wajah terakhir ${child.name}`}
              width={720}
              height={900}
              unoptimized
            />
          </div>
        )}

        <MiniGrowthChart examinations={examinations} isInfant={isInfant} />

        <div className="parent-latest-metrics">
          <article>
            <span>{linearMeasurementLabel}</span>
            <strong>{formatReading(latest?.heightCm ?? null)}</strong>
            <small>cm</small>
          </article>
          <article>
            <span>Berat</span>
            <strong>{formatReading(latest?.weightKg ?? null)}</strong>
            <small>kg</small>
          </article>
          <article>
            <span>{linearIndicator}</span>
            <strong className="metric-status">
              {latest ? growthStatusLabelForAge(latest.growthStatus, latest.ageMonths) : "Belum ada"}
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
              <span>STATUS STUNTING BERDASARKAN TB/U</span>
              <strong>
                {latest.measurementQuality === "recheck"
                  ? "Pengukuran perlu diulang"
                  : growthStatusLabelForAge(latest.growthStatus, latest.ageMonths)}
              </strong>
              <small>
                {latest.measurementQuality === "recheck"
                  ? latest.measurementReason
                  : `TB/U ${formatReading(latest.heightForAgeZ)} SD · AI visual ${
                      latest.visualAnalysis
                        ? visualAnalysisStatusLabel(
                            latest.visualAnalysis.status,
                          )
                        : facialAnalysisLabel(latest.facialStatus)
                    }`}
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
                  <strong>
                    {exam.measurementQuality === "recheck"
                      ? "Pengukuran perlu diulang"
                      : growthStatusLabelForAge(exam.growthStatus, exam.ageMonths)}
                  </strong>
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
