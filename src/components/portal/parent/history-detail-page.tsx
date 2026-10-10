"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  HeartHandshake,
  Info,
  Ruler,
  Scale,
  ScanFace,
  Utensils,
} from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import { growthStatusLabelForAge, linearGrowthIndicator } from "@/lib/growth";
import type { Examination, ParentAccountView } from "@/lib/portal";
import {
  KEMENKES_REFERENCE_URL,
  KIA_REFERENCE_URL,
  WHO_REFERENCE_URL,
} from "@/lib/report";
import {
  captureStatusLabel,
  facialAnalysisLabel,
  facialReasonLabel,
  formatAge,
  formatReading,
  visualAnalysisStatusLabel,
  visualFacePositionLabel,
  visualLightingLabel,
  visualVisibilityLabel,
} from "@/lib/screening";
import { Message, PortalShell } from "../shared/shell";

function formatExamDate(exam: Examination) {
  return new Date(exam.completedAt || exam.createdAt).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
}

function modelScore(exam: Examination) {
  return exam.facialProbability === null
    ? "Belum tersedia"
    : `${Math.round(exam.facialProbability * 100)}%`;
}

export function ParentHistoryDetailPage() {
  const router = useRouter();
  const params = useParams<{ examId: string }>();
  const examId = decodeURIComponent(params.examId || "");
  const [view, setView] = useState<ParentAccountView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api<ParentAccountView>("/parent-account/me", {
      signal: controller.signal,
    })
      .then(setView)
      .catch((cause) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ClientError && cause.status === 401) {
          router.replace("/login");
          return;
        }
        setError(errorMessage(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [router]);

  const exam = useMemo(
    () =>
      view?.examinations.find(
        (item) => item.id === examId && item.status === "completed",
      ) || null,
    [examId, view?.examinations],
  );

  if (loading) {
    return (
      <PortalShell
        tone="parent"
        heading="Hasil pemeriksaan"
        subtitle="Menyiapkan riwayat pertumbuhan anak."
      >
        <Message>Memuat hasil pemeriksaan…</Message>
      </PortalShell>
    );
  }

  if (error) {
    return (
      <PortalShell
        tone="parent"
        heading="Hasil pemeriksaan"
        subtitle="Riwayat pertumbuhan anak."
      >
        <Message error>{error}</Message>
        <Link className="parent-history-page-back" href="/ortu">
          <ArrowLeft size={18} />
          Kembali ke akun orang tua
        </Link>
      </PortalShell>
    );
  }

  if (!exam) {
    return (
      <PortalShell
        tone="parent"
        heading="Hasil tidak ditemukan"
        subtitle="Pemeriksaan ini tidak tersedia pada akun orang tua."
      >
        <Link className="parent-history-page-back" href="/ortu">
          <ArrowLeft size={18} />
          Kembali ke akun orang tua
        </Link>
      </PortalShell>
    );
  }

  const recommendations = exam.recommendations;
  const visual = exam.visualAnalysis;
  const linearIndicator = linearGrowthIndicator(exam.ageMonths);
  const linearMeasurementLabel =
    linearIndicator === "PB/U" ? "Panjang badan" : "Tinggi badan";
  const manualInfant = exam.measurementMode === "manual_infant";
  const showFacialReason =
    Boolean(exam.facialReason) &&
    (exam.facialStatus === "rejected" || exam.facialStatus === "unavailable");

  return (
    <PortalShell
      tone="parent"
      heading="Hasil pemeriksaan"
      subtitle="Riwayat lengkap hasil pertumbuhan anak."
      actions={
        <button
          type="button"
          className="portal-text"
          onClick={() => router.back()}
        >
          <ArrowLeft size={18} />
          Kembali
        </button>
      }
    >
      <div className="parent-history-page">
        <div className="parent-history-page-heading">
          <div>
            <span>HASIL PEMERIKSAAN</span>
            <h2>{exam.childName}</h2>
            <p>
              <CalendarDays size={16} />
              {formatExamDate(exam)}
            </p>
          </div>
          <span className="parent-history-page-status">
            {exam.measurementQuality === "recheck"
              ? "Pengukuran perlu diulang"
              : growthStatusLabelForAge(exam.growthStatus, exam.ageMonths)}
          </span>
        </div>

        <div className="parent-history-detail-summary">
          <span>{formatAge(exam.ageMonths)}</span>
          <span>{exam.sex === "male" ? "Laki-laki" : "Perempuan"}</span>
        </div>

        <div className="parent-history-detail-measurements">
          <article>
            <span>
              <Ruler size={18} />
              {linearMeasurementLabel}
            </span>
            <strong>
              {formatReading(exam.heightCm)}
              <small>cm</small>
            </strong>
          </article>

          <article>
            <span>
              <Scale size={18} />
              Berat badan
            </span>
            <strong>
              {formatReading(exam.weightKg)}
              <small>kg</small>
            </strong>
          </article>
        </div>

        <section className="parent-history-detail-section parent-history-who">
          <span>STATUS STUNTING BERDASARKAN {linearIndicator}</span>
          <strong>
            {exam.measurementQuality === "recheck"
              ? "Pengukuran perlu diulang"
              : growthStatusLabelForAge(exam.growthStatus, exam.ageMonths)}
          </strong>
          <dl>
            <div>
              <dt>{linearIndicator} Z-score</dt>
              <dd>{formatReading(exam.heightForAgeZ)} SD</dd>
            </div>
            <div>
              <dt>BB/U Z-score</dt>
              <dd>{formatReading(exam.weightForAgeZ)} SD</dd>
            </div>
            <div>
              <dt>IMT</dt>
              <dd>
                {formatReading(exam.bmi)}
                {exam.bmi === null ? "" : " kg/m²"}
              </dd>
            </div>
          </dl>
          <p>
            {exam.measurementQuality === "recheck"
              ? exam.measurementReason ||
                `Nilai ${linearMeasurementLabel.toLowerCase()} atau berat berada di luar rentang valid. Silakan ukur ulang.`
              : "Hasil WHO merupakan skrining pertumbuhan, bukan diagnosis."}
          </p>

          <div className="parent-result-sources">
            <span>SUMBER HASIL</span>
            <div className="parent-result-source-links">
              <a href={WHO_REFERENCE_URL} target="_blank" rel="noreferrer">
                WHO Child Growth Standards
                <ExternalLink size={13} />
              </a>
              <a href={KIA_REFERENCE_URL} target="_blank" rel="noreferrer">
                Buku KIA 2024
                <ExternalLink size={13} />
              </a>
            </div>
            <small>
              Z-score {linearIndicator} dihitung menggunakan standar pertumbuhan
              WHO. Buku KIA Kemenkes RI digunakan sebagai referensi pendamping
              pemantauan pertumbuhan anak.
            </small>
          </div>
        </section>

        <section className="parent-history-detail-section">
          <div className="parent-history-model-title">
            <ScanFace size={20} />
            <div>
              <span>ANALISIS VISUAL AI — PENDUKUNG</span>
              <strong>
                {visual
                  ? visualAnalysisStatusLabel(visual.status)
                  : facialAnalysisLabel(exam.facialStatus)}
              </strong>
            </div>
          </div>

          {manualInfant ? (
            <p>
              Analisis visual tidak digunakan pada pemeriksaan manual bayi.
              Hasil pertumbuhan dihitung dari panjang badan, berat badan, usia,
              dan jenis kelamin.
            </p>
          ) : visual ? (
            <>
              <dl>
                <div>
                  <dt>Mata</dt>
                  <dd>{visualVisibilityLabel(visual.eyes)}</dd>
                </div>
                <div>
                  <dt>Hidung</dt>
                  <dd>{visualVisibilityLabel(visual.nose)}</dd>
                </div>
                <div>
                  <dt>Mulut</dt>
                  <dd>{visualVisibilityLabel(visual.mouth)}</dd>
                </div>
                <div>
                  <dt>Posisi wajah</dt>
                  <dd>{visualFacePositionLabel(visual.facePosition)}</dd>
                </div>
                <div>
                  <dt>Pencahayaan</dt>
                  <dd>{visualLightingLabel(visual.lighting)}</dd>
                </div>
              </dl>

              {visual.observations.length > 0 && (
                <ul className="parent-history-visual-observations">
                  {visual.observations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              {visual.reason && <p>{visual.reason}</p>}
            </>
          ) : (
            <>
              <dl>
                <div>
                  <dt>Skor model lama</dt>
                  <dd>{modelScore(exam)}</dd>
                </div>
                <div>
                  <dt>Versi model</dt>
                  <dd>{exam.facialModelVersion || "Model A V2.1"}</dd>
                </div>
              </dl>
              {showFacialReason && exam.facialReason && (
                <p>{facialReasonLabel(exam.facialReason)}</p>
              )}
            </>
          )}

          <p>
            AI visual hanya menilai kualitas foto dan bagian wajah yang
            terlihat. Status stunting tetap ditentukan dari {linearIndicator}.
          </p>
        </section>

        <section className="parent-history-clinical-section">
          <div className="parent-history-clinical-title">
            <Info size={20} />
            <h3>Dasar penilaian & sumber resmi</h3>
          </div>

          <dl>
            <div>
              <dt>IMT numerik</dt>
              <dd>
                {formatReading(exam.bmi)}
                {exam.bmi === null ? "" : " kg/m²"}
              </dd>
            </div>
            <div>
              <dt>{linearIndicator} Z-score WHO</dt>
              <dd>{formatReading(exam.heightForAgeZ)}</dd>
            </div>
            <div>
              <dt>BB/U Z-score WHO</dt>
              <dd>{formatReading(exam.weightForAgeZ)}</dd>
            </div>
            <div>
              <dt>Validitas pengukuran</dt>
              <dd>
                {exam.measurementQuality === "recheck"
                  ? "Perlu diulang"
                  : exam.measurementQuality === "incomplete"
                    ? "Belum lengkap"
                    : "Valid"}
              </dd>
            </div>
            <div>
              <dt>Penilaian pertumbuhan</dt>
              <dd>
                {exam.measurementQuality === "recheck"
                  ? "Belum dapat disimpulkan"
                  : growthStatusLabelForAge(exam.growthStatus, exam.ageMonths)}
              </dd>
            </div>
            <div>
              <dt>Analisis visual pendukung</dt>
              <dd>
                {visual
                  ? visualAnalysisStatusLabel(visual.status)
                  : facialAnalysisLabel(exam.facialStatus)}
              </dd>
            </div>
            <div>
              <dt>Pengambilan wajah</dt>
              <dd>{captureStatusLabel(exam.captureStatus)}</dd>
            </div>
          </dl>

          <p>
            Status stunting dihitung dari {linearIndicator} berdasarkan Standar
            Antropometri Anak Kemenkes RI dan WHO Child Growth Standards. BB/U
            adalah indikator tambahan dan membantu mendeteksi hasil pengukuran
            yang perlu diverifikasi. Buku KIA Edisi 2024 digunakan sebagai
            referensi pendamping pemantauan pertumbuhan keluarga. Analisis
            visual AI tidak menentukan status stunting.
          </p>

          <div className="parent-history-reference-list">
            <a href={KEMENKES_REFERENCE_URL} target="_blank" rel="noreferrer">
              Kemenkes RI — Permenkes No. 2 Tahun 2020
              <ExternalLink size={14} />
            </a>
            <a href={KIA_REFERENCE_URL} target="_blank" rel="noreferrer">
              Kemenkes RI — Buku KIA Edisi 2024
              <ExternalLink size={14} />
            </a>
            <a href={WHO_REFERENCE_URL} target="_blank" rel="noreferrer">
              WHO Child Growth Standards
              <ExternalLink size={14} />
            </a>
          </div>
        </section>

        {recommendations.trendDelta !== null && (
          <div className="parent-history-trend-note">
            <strong>Perbandingan dengan pemeriksaan sebelumnya</strong>
            <span>
              {linearIndicator}{" "}
              {recommendations.trend === "declining"
                ? "turun"
                : recommendations.trend === "improving"
                  ? "naik"
                  : "relatif stabil"}{" "}
              {Math.abs(recommendations.trendDelta).toFixed(2)} SD.
            </span>
          </div>
        )}

        <section className="parent-history-clinical-section parent-history-risk">
          <div className="parent-history-clinical-title">
            <Info size={20} />
            <h3>Prediksi risiko stunting berbasis tren</h3>
          </div>
          <strong className="parent-history-risk-label">
            {recommendations.risk.label}
          </strong>
          <dl>
            <div>
              <dt>Data tren yang dipakai</dt>
              <dd>{recommendations.risk.pointsUsed} pemeriksaan</dd>
            </div>
            <div>
              <dt>Perubahan {linearIndicator} per 30 hari</dt>
              <dd>
                {recommendations.risk.zChangePer30Days === null
                  ? "Belum tersedia"
                  : recommendations.risk.zChangePer30Days.toFixed(2) + " SD"}
              </dd>
            </div>
            <div>
              <dt>Proyeksi {linearIndicator} 90 hari</dt>
              <dd>
                {recommendations.risk.projectedHeightForAgeZ === null
                  ? "Belum tersedia"
                  : recommendations.risk.projectedHeightForAgeZ.toFixed(2) +
                    " SD"}
              </dd>
            </div>
          </dl>
          {recommendations.risk.reasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
          <p>{recommendations.risk.disclaimer}</p>
        </section>

        <section className="parent-history-clinical-section parent-history-nutrition">
          <div className="parent-history-clinical-title">
            <Utensils size={20} />
            <h3>Localized Nutrition Recommendation Engine</h3>
          </div>

          <ul className="parent-history-follow-up">
            {recommendations.nutrition.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="parent-local-nutrition-plan">
            <strong>{recommendations.localizedNutrition.title}</strong>
            <span>
              Usia sasaran {recommendations.localizedNutrition.ageBand}
            </span>

            <div className="parent-local-food-groups">
              {recommendations.localizedNutrition.foodGroups.map((group) => (
                <div key={group.label}>
                  <b>{group.label}</b>
                  <span>{group.examples.join(", ")}</span>
                </div>
              ))}
            </div>

            {recommendations.localizedNutrition.sampleDay.length > 0 && (
              <>
                <h4>Contoh menu sehari</h4>
                <dl>
                  {recommendations.localizedNutrition.sampleDay.map((meal) => (
                    <div key={meal.slot}>
                      <dt>{meal.slot}</dt>
                      <dd>{meal.menu}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            <ul className="parent-history-follow-up">
              {recommendations.localizedNutrition.cautions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="parent-local-nutrition-sources">
              {recommendations.localizedNutrition.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.label}
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="parent-history-clinical-section">
          <div className="parent-history-clinical-title">
            <HeartHandshake size={20} />
            <h3>Penanganan / langkah selanjutnya</h3>
          </div>

          <ol className="parent-history-follow-up">
            {recommendations.nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <p className="parent-history-recommendation-source">
          Rekomendasi ini merupakan edukasi berdasarkan status {linearIndicator}
          , tren pertumbuhan, serta panduan gizi Kemenkes. Bukan diagnosis,
          resep, atau pengganti konsultasi tenaga kesehatan.
        </p>

        <p className="parent-history-disclaimer">
          Simpan hasil ini untuk dibandingkan dengan pemeriksaan berikutnya.
          StuntSpecula membantu skrining pertumbuhan dan tidak menggantikan
          pemeriksaan tenaga kesehatan.
        </p>

        <Link className="parent-history-page-back bottom" href="/ortu">
          <ArrowLeft size={18} />
          Kembali ke akun orang tua
        </Link>
      </div>
    </PortalShell>
  );
}
