"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { growthStatusLabel } from "@/lib/growth";
import type { Examination } from "@/lib/portal";
import { facialAnalysisLabel, formatReading } from "@/lib/screening";

function formatExamDate(exam: Examination) {
  return new Date(exam.completedAt || exam.createdAt).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

export function ParentHistory({
  examinations,
}: {
  examinations: Examination[];
}) {
  return (
    <>
      <div className="section-heading compact-section-heading">
        <div>
          <h2>Riwayat pertumbuhan</h2>
          <p className="portal-note">
            Semua pemeriksaan tersimpan di sini. Buka salah satu hasil untuk
            melihat detail lengkapnya.
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

              <Link
                className="parent-history-detail-button"
                href={`/ortu/riwayat/${encodeURIComponent(exam.id)}`}
              >
                Lihat hasil lengkap
                <ChevronRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
