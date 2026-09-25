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
import { growthStatusLabel } from "@/lib/growth";
import type { Examination, ParentAccountView } from "@/lib/portal";
import { WHO_REFERENCE_URL } from "@/lib/report";
import {
  captureStatusLabel,
  facialAnalysisLabel,
  facialReasonLabel,
  formatAge,
  formatReading,
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
            {growthStatusLabel(exam.growthStatus)}
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
              Tinggi badan
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
          <span>HASIL PERTUMBUHAN WHO</span>
          <strong>{growthStatusLabel(exam.growthStatus)}</strong>
          <dl>
            <div>
              <dt>TB/U Z-score</dt>
              <dd>{formatReading(exam.heightForAgeZ)} SD</dd>
            </div>
            <div>
              <dt>IMT</dt>
              <dd>
                {formatReading(exam.bmi)}
                {exam.bmi === null ? "" : " kg/m²"}
              </dd>
            </div>
          </dl>
          <p>Hasil WHO merupakan skrining pertumbuhan, bukan diagnosis.</p>
        </section>

        <section className="parent-history-detail-section">
          <div className="parent-history-model-title">
            <ScanFace size={20} />
            <div>
              <span>ANALISIS WAJAH — PENDUKUNG</span>
              <strong>{facialAnalysisLabel(exam.facialStatus)}</strong>
            </div>
          </div>

          <dl>
            <div>
              <dt>Skor model</dt>
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

          <p>
            Analisis wajah hanya informasi pendukung. Hasil utama tetap berasal
            dari TB/U WHO.
          </p>
        </section>

        <section className="parent-history-clinical-section">
          <div className="parent-history-clinical-title">
            <Info size={20} />
            <h3>Dasar hasil</h3>
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
              <dt>TB/U Z-score WHO</dt>
              <dd>{formatReading(exam.heightForAgeZ)}</dd>
            </div>
            <div>
              <dt>Penilaian pertumbuhan</dt>
              <dd>{growthStatusLabel(exam.growthStatus)}</dd>
            </div>
            <div>
              <dt>Analisis wajah pendukung</dt>
              <dd>{facialAnalysisLabel(exam.facialStatus)}</dd>
            </div>
            <div>
              <dt>Pengambilan wajah</dt>
              <dd>{captureStatusLabel(exam.captureStatus)}</dd>
            </div>
          </dl>

          <p>
            Status stunting utama dihitung dari tinggi menurut umur berdasarkan
            standar WHO untuk anak usia 24–59 bulan. Model wajah ditampilkan
            terpisah sebagai skrining eksperimental dan bukan diagnosis.
          </p>

          <a href={WHO_REFERENCE_URL} target="_blank" rel="noreferrer">
            Referensi WHO: panjang/tinggi menurut umur
            <ExternalLink size={14} />
          </a>
        </section>

        {recommendations.trendDelta !== null && (
          <div className="parent-history-trend-note">
            <strong>Perbandingan dengan pemeriksaan sebelumnya</strong>
            <span>
              TB/U{" "}
              {recommendations.trend === "declining"
                ? "turun"
                : recommendations.trend === "improving"
                  ? "naik"
                  : "relatif stabil"}{" "}
              {Math.abs(recommendations.trendDelta).toFixed(2)} SD.
            </span>
          </div>
        )}

        <section className="parent-history-clinical-section parent-history-nutrition">
          <div className="parent-history-clinical-title">
            <Utensils size={20} />
            <h3>Rekomendasi nutrisi</h3>
          </div>

          <ul className="parent-history-follow-up">
            {recommendations.nutrition.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
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
          Rekomendasi ini merupakan edukasi berdasarkan status TB/U WHO dan
          panduan gizi umum. Bukan diagnosis, resep, atau pengganti konsultasi
          tenaga kesehatan.
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
