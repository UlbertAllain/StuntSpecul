"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Ruler, Scale, ScanFace } from "lucide-react";
import { api, ClientError, errorMessage } from "@/lib/api-client";
import { growthStatusLabel } from "@/lib/growth";
import type { Examination, ParentAccountView } from "@/lib/portal";
import { facialAnalysisLabel, formatAge, formatReading } from "@/lib/screening";
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

          <p>
            Analisis wajah hanya informasi pendukung. Hasil utama tetap berasal
            dari TB/U WHO.
          </p>
        </section>

        <Link className="parent-history-page-back bottom" href="/ortu">
          <ArrowLeft size={18} />
          Kembali ke akun orang tua
        </Link>
      </div>
    </PortalShell>
  );
}
