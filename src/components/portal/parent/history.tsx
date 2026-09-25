"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Ruler,
  Scale,
  ScanFace,
  X,
} from "lucide-react";
import { growthStatusLabel } from "@/lib/growth";
import type { Examination } from "@/lib/portal";
import { facialAnalysisLabel, formatAge, formatReading } from "@/lib/screening";

function examinationDate(exam: Examination) {
  return new Date(exam.completedAt || exam.createdAt);
}

function formatExamDate(exam: Examination, long = false) {
  return examinationDate(exam).toLocaleDateString("id-ID", {
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
  });
}

function modelScore(exam: Examination) {
  return exam.facialProbability === null
    ? "Belum tersedia"
    : `${Math.round(exam.facialProbability * 100)}%`;
}

export function ParentHistory({
  examinations,
}: {
  examinations: Examination[];
}) {
  const [selectedExam, setSelectedExam] = useState<Examination | null>(null);

  useEffect(() => {
    if (!selectedExam) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedExam(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedExam]);

  return (
    <>
      <div className="section-heading compact-section-heading">
        <div>
          <h2>Riwayat pertumbuhan</h2>
          <p className="portal-note">
            Semua pemeriksaan tersimpan di sini. Buka detail untuk melihat hasil
            lengkap kapan saja.
          </p>
        </div>
      </div>

      {examinations.length === 0 ? (
        <div className="portal-empty">
          <h3>Belum ada riwayat</h3>
          <p>Riwayat akan terisi otomatis setelah pemeriksaan selesai.</p>
        </div>
      ) : (
        <div className="parent-flat-history">
          {examinations.map((exam) => (
            <article key={exam.id} className="parent-flat-history-card">
              <div className="parent-history-head">
                <div>
                  <span className="parent-history-child">{exam.childName}</span>
                  <strong>{formatExamDate(exam)}</strong>
                </div>

                <span className="parent-history-status">
                  {growthStatusLabel(exam.growthStatus)}
                </span>
              </div>

              <dl className="parent-history-metrics">
                <div>
                  <dt>Tinggi</dt>
                  <dd>{formatReading(exam.heightCm)} cm</dd>
                </div>

                <div>
                  <dt>Berat</dt>
                  <dd>{formatReading(exam.weightKg)} kg</dd>
                </div>

                <div>
                  <dt>Model A</dt>
                  <dd>{facialAnalysisLabel(exam.facialStatus)}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="parent-history-detail-button"
                onClick={() => setSelectedExam(exam)}
              >
                Lihat hasil lengkap
                <ChevronRight size={17} />
              </button>
            </article>
          ))}
        </div>
      )}

      {selectedExam && (
        <div
          className="parent-history-detail-backdrop"
          role="presentation"
          onClick={() => setSelectedExam(null)}
        >
          <section
            className="parent-history-detail-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="parent-history-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="parent-history-detail-head">
              <div>
                <span>HASIL PEMERIKSAAN</span>
                <h3 id="parent-history-detail-title">
                  {selectedExam.childName}
                </h3>
                <p>
                  <CalendarDays size={15} />
                  {formatExamDate(selectedExam, true)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                aria-label="Tutup detail pemeriksaan"
              >
                <X size={20} />
              </button>
            </header>

            <div className="parent-history-detail-summary">
              <span>{formatAge(selectedExam.ageMonths)}</span>
              <span>
                {selectedExam.sex === "male" ? "Laki-laki" : "Perempuan"}
              </span>
            </div>

            <div className="parent-history-detail-measurements">
              <article>
                <span>
                  <Ruler size={18} />
                  Tinggi badan
                </span>
                <strong>
                  {formatReading(selectedExam.heightCm)}
                  <small>cm</small>
                </strong>
              </article>
              <article>
                <span>
                  <Scale size={18} />
                  Berat badan
                </span>
                <strong>
                  {formatReading(selectedExam.weightKg)}
                  <small>kg</small>
                </strong>
              </article>
            </div>

            <section className="parent-history-detail-section parent-history-who">
              <span>HASIL PERTUMBUHAN WHO</span>
              <strong>{growthStatusLabel(selectedExam.growthStatus)}</strong>
              <dl>
                <div>
                  <dt>TB/U Z-score</dt>
                  <dd>{formatReading(selectedExam.heightForAgeZ)} SD</dd>
                </div>
                <div>
                  <dt>IMT</dt>
                  <dd>
                    {formatReading(selectedExam.bmi)}
                    {selectedExam.bmi === null ? "" : " kg/m²"}
                  </dd>
                </div>
              </dl>
              <p>Hasil WHO merupakan skrining pertumbuhan, bukan diagnosis.</p>
            </section>

            <section className="parent-history-detail-section">
              <div className="parent-history-model-title">
                <ScanFace size={19} />
                <div>
                  <span>ANALISIS WAJAH — PENDUKUNG</span>
                  <strong>
                    {facialAnalysisLabel(selectedExam.facialStatus)}
                  </strong>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Skor model</dt>
                  <dd>{modelScore(selectedExam)}</dd>
                </div>
                <div>
                  <dt>Versi model</dt>
                  <dd>{selectedExam.facialModelVersion || "Model A V2.1"}</dd>
                </div>
              </dl>
              <p>
                Analisis wajah hanya informasi pendukung. Hasil utama tetap
                berasal dari TB/U WHO.
              </p>
            </section>

            <button
              type="button"
              className="parent-history-detail-close"
              onClick={() => setSelectedExam(null)}
            >
              Tutup
            </button>
          </section>
        </div>
      )}
    </>
  );
}
