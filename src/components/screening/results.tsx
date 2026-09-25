"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  HeartHandshake,
  Info,
  Ruler,
  Scale,
  ScanFace,
  Utensils,
} from "lucide-react";
import { downloadReport, WHO_REFERENCE_URL } from "@/lib/report";
import { growthStatusLabel, stuntingScreeningLabel } from "@/lib/growth";
import {
  growthRecommendationsFor,
  type GrowthRecommendations,
} from "@/lib/growth-recommendations";
import {
  captureStatusLabel,
  facialAnalysisLabel,
  facialReasonLabel,
  formatAge,
  formatReading,
  type ScreeningReport,
} from "@/lib/screening";
import { Mascot } from "./mascot";

export function Results({
  report,
  onFinish,
  awaitingParentFinalize = false,
  temporaryMeasurements = false,
  recommendations: savedRecommendations = null,
}: {
  report: ScreeningReport;
  onFinish?: () => void;
  awaitingParentFinalize?: boolean;
  temporaryMeasurements?: boolean;
  recommendations?: GrowthRecommendations | null;
}) {
  const [detail, setDetail] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const recommendations =
    savedRecommendations ??
    growthRecommendationsFor(report.growthStatus, {
      currentHeightForAgeZ: report.heightForAgeZ,
    });
  const facial = report.facialAnalysis;
  const showFacialReason =
    Boolean(facial.reason) &&
    (facial.status === "rejected" || facial.status === "unavailable");

  function save() {
    try {
      downloadReport(report, recommendations);
      setSaved(true);
      setError("");
    } catch {
      setError("Laporan belum berhasil diunduh. Silakan coba lagi.");
    }
  }

  return (
    <section className="results-screen">
      {detail ? (
        <>
          <button className="text-button" onClick={() => setDetail(false)}>
            <ArrowLeft size={19} />
            Ringkasan
          </button>
          <div className="screen-heading">
            <span className="stage-kicker">UNTUK PENDAMPING</span>
            <h1>Detail pemeriksaan.</h1>
          </div>
        </>
      ) : (
        <div className="result-intro">
          <div>
            <span className="stage-kicker">SELESAI!</span>
            <h1>
              Tos dulu,
              <br />
              kamu hebat!
            </h1>
          </div>
          <Mascot pose="cheer" interactive interaction="high-five" />
        </div>
      )}

      <div className="result-identity">
        <span>{formatAge(report.child.ageMonths)}</span>
        <span>{report.child.sex === "male" ? "Laki-laki" : "Perempuan"}</span>
        <span>{new Date(report.completedAt).toLocaleDateString("id-ID")}</span>
      </div>

      <div className="body-results">
        <div>
          <Ruler size={21} />
          <span>Tinggi badan</span>
          <strong>
            {formatReading(report.readings.heightCm)}
            <small>cm</small>
          </strong>
        </div>
        <div>
          <Scale size={21} />
          <span>Berat badan</span>
          <strong>
            {formatReading(report.readings.weightKg)}
            <small>kg</small>
          </strong>
        </div>
      </div>

      {temporaryMeasurements && (
        <p className="temporary-reading-note">
          Sensor fisik belum terhubung — nilai TB/BB sementara digunakan agar
          alur pemeriksaan tetap dapat diuji.
        </p>
      )}

      <div
        className={`growth-result ${report.growthStatus === "unavailable" ? "unavailable-result" : ""}`}
      >
        <div className="growth-result-primary">
          <span>Hasil pertumbuhan WHO</span>
          <strong>{growthStatusLabel(report.growthStatus)}</strong>
        </div>
        <dl className="growth-result-meta">
          <div>
            <dt>Status TB/U</dt>
            <dd>{stuntingScreeningLabel(report.stuntingScreening)}</dd>
          </div>
          <div>
            <dt>Z-score</dt>
            <dd>{formatReading(report.heightForAgeZ)}</dd>
          </div>
        </dl>
        <p>
          {report.heightForAgeZ === null
            ? "TB/U belum dapat dihitung karena pembacaan tinggi badan belum tersedia atau tidak valid."
            : "Hasil ini adalah skrining, bukan diagnosis."}
        </p>
      </div>

      <div className="facial-results">
        <h2>
          <ScanFace size={22} />
          Analisis wajah — pendukung
        </h2>
        <div>
          <span>Model A V2.1</span>
          <strong>{facialAnalysisLabel(facial.status)}</strong>
        </div>
        {facial.probability !== null && (
          <div>
            <span>Skor model</span>
            <strong>{Math.round(facial.probability * 100)}%</strong>
          </div>
        )}
        {showFacialReason && facial.reason && (
          <p>{facialReasonLabel(facial.reason)}</p>
        )}
        <p>
          Analisis wajah hanya menjadi informasi pendukung. Hasil utama tetap
          berasal dari TB/U WHO.
        </p>
      </div>

      <div className="result-recommendation-grid">
        <section className="result-recommendation-card nutrition">
          <h2>
            <Utensils size={20} />
            Rekomendasi nutrisi
          </h2>
          <ul>
            {recommendations.nutrition.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="result-recommendation-card care">
          <h2>
            <HeartHandshake size={20} />
            Penanganan / langkah selanjutnya
          </h2>
          <ol>
            {recommendations.nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      </div>
      {recommendations.trendDelta !== null && (
        <p className="result-recommendation-trend">
          Dibanding pemeriksaan sebelumnya: TB/U{" "}
          {recommendations.trend === "declining"
            ? "turun"
            : recommendations.trend === "improving"
              ? "naik"
              : "relatif stabil"}{" "}
          {Math.abs(recommendations.trendDelta).toFixed(2)} SD.
        </p>
      )}
      <p className="result-recommendation-note">
        Rekomendasi edukasi mengikuti status TB/U WHO dan bukan resep atau
        diagnosis individual.
      </p>

      {detail && (
        <>
          <div className="clinical-detail">
            <h2>
              <Info size={21} />
              Dasar hasil
            </h2>
            <dl>
              <div>
                <dt>IMT numerik</dt>
                <dd>{formatReading(report.bmi)} kg/m²</dd>
              </div>
              <div>
                <dt>TB/U Z-score WHO</dt>
                <dd>{formatReading(report.heightForAgeZ)}</dd>
              </div>
              <div>
                <dt>Penilaian pertumbuhan</dt>
                <dd>{growthStatusLabel(report.growthStatus)}</dd>
              </div>
              <div>
                <dt>Analisis wajah pendukung</dt>
                <dd>{facialAnalysisLabel(facial.status)}</dd>
              </div>
              <div>
                <dt>Pengambilan wajah</dt>
                <dd>{captureStatusLabel(report.captureStatus)}</dd>
              </div>
            </dl>
            <p>
              Status stunting utama dihitung dari tinggi menurut umur
              berdasarkan standar WHO untuk anak usia 24–59 bulan. Model wajah
              ditampilkan terpisah sebagai skrining eksperimental dan bukan
              diagnosis.
            </p>
            <a href={WHO_REFERENCE_URL} target="_blank" rel="noreferrer">
              Referensi WHO: panjang/tinggi menurut umur ↗
            </a>
          </div>
        </>
      )}

      {!detail && (
        <button
          className="text-button detail-link"
          onClick={() => setDetail(true)}
        >
          Lihat dasar hasil
          <ArrowRight size={18} />
        </button>
      )}

      {awaitingParentFinalize ? (
        <div className="session-status-card">
          <div>
            <span>Status sesi</span>
            <strong>Menunggu orang tua</strong>
          </div>
          <p>
            Hasil sudah tersimpan. Orang tua dapat menutup sesi dari tombol
            Mulai di HP, lalu alat kembali siap untuk pemeriksaan berikutnya.
          </p>
        </div>
      ) : (
        <div className="result-actions">
          <button className="secondary-button" onClick={save}>
            {saved ? <Check size={20} /> : <Download size={20} />}Simpan
          </button>
          {onFinish && (
            <button className="primary-button" onClick={onFinish}>
              Selesai
              <Check size={21} />
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <p className="parent-caption" role="status">
        {awaitingParentFinalize
          ? "Hasil juga tersedia pada akun orang tua yang terhubung."
          : saved
            ? "Laporan sudah diunduh (.txt)."
            : "Hasil juga tersedia di HP orang tua yang terhubung."}
      </p>
    </section>
  );
}
