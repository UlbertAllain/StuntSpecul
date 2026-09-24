"use client";

import type { Examination } from "@/lib/portal";
import { growthStatusLabel } from "@/lib/growth";
import { formatReading } from "@/lib/screening";

export function ParentHistory({ examinations }: { examinations: Examination[] }) {
  return (
    <>
      <div className="section-heading compact-section-heading">
        <div>
          <h2>Riwayat pertumbuhan</h2>
          <p className="portal-note">
            Semua hasil penting langsung terlihat tanpa membuka detail lagi.
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
                  <strong>
                    {new Date(
                      exam.completedAt || exam.createdAt,
                    ).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
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
                  <dd>
                    {exam.facialStatus === "stunting_indication"
                      ? "Indikasi"
                      : exam.facialStatus === "non_stunting_indication"
                        ? "Tidak terindikasi"
                        : exam.facialStatus === "rejected"
                          ? "Ulang foto"
                          : "Belum tersedia"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

