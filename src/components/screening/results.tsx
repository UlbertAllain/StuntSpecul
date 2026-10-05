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
import {
  downloadReport,
  KEMENKES_REFERENCE_URL,
  KIA_REFERENCE_URL,
  WHO_REFERENCE_URL,
} from "@/lib/report";
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
  visualAnalysisStatusLabel,
  visualFacePositionLabel,
  visualLightingLabel,
  visualVisibilityLabel,
  type ScreeningReport,
} from "@/lib/screening";
import { Mascot } from "./mascot";

export function Results({
  report,
  onFinish,
  awaitingParentFinalize = false,
  recommendations: savedRecommendations = null,
  photoPreviewUrl = null,
}: {
  report: ScreeningReport;
  onFinish?: () => void;
  awaitingParentFinalize?: boolean;
  recommendations?: GrowthRecommendations | null;
  photoPreviewUrl?: string | null;
}) {
  const [detail, setDetail] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const recommendations =
    savedRecommendations ??
    growthRecommendationsFor(report.growthStatus, {
      ageMonths: report.child.ageMonths,
      currentHeightForAgeZ: report.heightForAgeZ,
      currentAt: Date.parse(report.completedAt),
    });
  const facial = report.facialAnalysis;
  const visual = report.visualAnalysis;
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

      <div
        className={`growth-result ${report.growthStatus === "unavailable" ? "unavailable-result" : ""}`}
      >
        <div className="growth-result-primary">
          <span>Status stunting berdasarkan TB/U</span>
          <strong>
            {report.measurementQuality === "recheck"
              ? "Pengukuran perlu diulang"
              : growthStatusLabel(report.growthStatus)}
          </strong>
        </div>
        <dl className="growth-result-meta">
          <div>
            <dt>Status TB/U</dt>
            <dd>{stuntingScreeningLabel(report.stuntingScreening)}</dd>
          </div>
          <div>
            <dt>TB/U Z-score</dt>
            <dd>{formatReading(report.heightForAgeZ)}</dd>
          </div>
          <div>
            <dt>BB/U Z-score</dt>
            <dd>{formatReading(report.weightForAgeZ)}</dd>
          </div>
        </dl>
        <p>
          {report.measurementQuality === "recheck"
            ? report.measurementReason ||
              "Data tinggi atau berat tidak valid. Silakan ulangi pengukuran."
            : report.heightForAgeZ === null
              ? "TB/U belum dapat dihitung karena pembacaan tinggi badan belum tersedia atau tidak valid."
              : "Stunting ditandai bila TB/U < -2 SD. Hasil ini adalah skrining, bukan diagnosis."}
        </p>
      </div>

      <section
        className={"stunting-risk-card risk-" + recommendations.risk.level}
      >
        <span>PREDIKSI RISIKO STUNTING BERBASIS TREN</span>
        <strong>{recommendations.risk.label}</strong>
        {recommendations.risk.projectedHeightForAgeZ !== null && (
          <dl>
            <div>
              <dt>Proyeksi 90 hari</dt>
              <dd>
                {recommendations.risk.projectedHeightForAgeZ.toFixed(2)} SD
              </dd>
            </div>
            <div>
              <dt>Perubahan / 30 hari</dt>
              <dd>
                {recommendations.risk.zChangePer30Days?.toFixed(2) ?? "—"} SD
              </dd>
            </div>
            <div>
              <dt>Data tren</dt>
              <dd>{recommendations.risk.pointsUsed} pemeriksaan</dd>
            </div>
          </dl>
        )}
        {recommendations.risk.reasons.map((reason) => (
          <p key={reason}>{reason}</p>
        ))}
        <small>{recommendations.risk.disclaimer}</small>
      </section>

      <div className="facial-results">
        <h2>
          <ScanFace size={22} />
          Analisis visual AI — pendukung
        </h2>

        {photoPreviewUrl && (
          <div
            className="visual-photo-preview"
            role="img"
            aria-label="Foto wajah yang baru diambil"
            style={{ backgroundImage: `url("${photoPreviewUrl}")` }}
          >
            <span>Foto pemeriksaan ini</span>
          </div>
        )}

        {visual ? (
          <>
            <div>
              <span>Status foto</span>
              <strong>{visualAnalysisStatusLabel(visual.status)}</strong>
            </div>
            <div>
              <span>Mata</span>
              <strong>{visualVisibilityLabel(visual.eyes)}</strong>
            </div>
            <div>
              <span>Hidung</span>
              <strong>{visualVisibilityLabel(visual.nose)}</strong>
            </div>
            <div>
              <span>Mulut</span>
              <strong>{visualVisibilityLabel(visual.mouth)}</strong>
            </div>
            <div>
              <span>Posisi wajah</span>
              <strong>{visualFacePositionLabel(visual.facePosition)}</strong>
            </div>
            <div>
              <span>Pencahayaan</span>
              <strong>{visualLightingLabel(visual.lighting)}</strong>
            </div>
            {visual.observations.length > 0 && (
              <>
                <p className="visual-detail-title">Detail tampilan wajah</p>
                <ul className="visual-observation-list">
                  {visual.observations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            {visual.reason && <p>{visual.reason}</p>}
          </>
        ) : (
          <>
            <div>
              <span>Model A V2.1 (riwayat lama)</span>
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
          </>
        )}

        <div className="visual-who-summary">
          <span>HASIL SKRINING STUNTING</span>
          <strong>{stuntingScreeningLabel(report.stuntingScreening)}</strong>
          <p>
            Kesimpulan ini berasal dari TB/U WHO berdasarkan usia, jenis
            kelamin, dan tinggi badan. Bukan prediksi dari tampilan wajah.
          </p>
        </div>

        <p className="visual-disclaimer">
          Gemini dipakai untuk membaca kualitas foto dan ciri visual yang
          tampak. Hasil visual hanya data pendukung dan tidak menggantikan
          skrining WHO.
        </p>
      </div>

      <div className="result-recommendation-grid">
        <section className="result-recommendation-card nutrition">
          <h2>
            <Utensils size={20} />
            Rekomendasi nutrisi lokal
          </h2>
          <ul>
            {recommendations.nutrition.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="result-local-foods">
            <strong>{recommendations.localizedNutrition.title}</strong>
            <p>
              Usia sasaran: {recommendations.localizedNutrition.ageBand}. Pilih
              bahan yang tersedia dan terjangkau di sekitar keluarga.
            </p>
            <div className="result-local-food-groups">
              {recommendations.localizedNutrition.foodGroups.map((group) => (
                <span key={group.label}>
                  <b>{group.label}</b>
                  {group.examples.join(", ")}
                </span>
              ))}
            </div>
            <h3>Contoh menu sehari</h3>
            <dl>
              {recommendations.localizedNutrition.sampleDay.map((meal) => (
                <div key={meal.slot}>
                  <dt>{meal.slot}</dt>
                  <dd>{meal.menu}</dd>
                </div>
              ))}
            </dl>
            <small>{recommendations.localizedNutrition.cautions[0]}</small>
          </div>
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
                <dt>BB/U Z-score WHO</dt>
                <dd>{formatReading(report.weightForAgeZ)}</dd>
              </div>
              <div>
                <dt>Validitas pengukuran</dt>
                <dd>
                  {report.measurementQuality === "recheck"
                    ? "Perlu diulang"
                    : report.measurementQuality === "incomplete"
                      ? "Belum lengkap"
                      : "Valid"}
                </dd>
              </div>
              <div>
                <dt>Penilaian pertumbuhan</dt>
                <dd>
                  {report.measurementQuality === "recheck"
                    ? "Belum dapat disimpulkan"
                    : growthStatusLabel(report.growthStatus)}
                </dd>
              </div>
              <div>
                <dt>Analisis visual pendukung</dt>
                <dd>
                  {visual
                    ? visualAnalysisStatusLabel(visual.status)
                    : facialAnalysisLabel(facial.status)}
                </dd>
              </div>
              <div>
                <dt>Pengambilan wajah</dt>
                <dd>{captureStatusLabel(report.captureStatus)}</dd>
              </div>
            </dl>
            <p>
              Status stunting dihitung dari TB/U berdasarkan Standar
              Antropometri Anak Kemenkes RI dan WHO Child Growth Standards untuk
              anak usia 24–59 bulan. Buku KIA Edisi 2024 ditampilkan sebagai
              referensi pendamping pemantauan pertumbuhan keluarga. Gemini hanya
              membaca foto dan tidak menentukan status stunting.
            </p>
            <div className="clinical-reference-list">
              <a href={KEMENKES_REFERENCE_URL} target="_blank" rel="noreferrer">
                Kemenkes RI — Permenkes No. 2 Tahun 2020 ↗
              </a>
              <a href={KIA_REFERENCE_URL} target="_blank" rel="noreferrer">
                Kemenkes RI — Buku KIA Edisi 2024 ↗
              </a>
              <a href={WHO_REFERENCE_URL} target="_blank" rel="noreferrer">
                WHO Child Growth Standards ↗
              </a>
            </div>
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
