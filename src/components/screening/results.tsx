"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Info,
  Ruler,
  Scale,
  ScanFace,
  Stethoscope,
} from "lucide-react";
import { downloadReport, WHO_REFERENCE_URL } from "@/lib/report";
import {
  followUpForGrowthStatus,
  growthStatusLabel,
  stuntingScreeningLabel,
} from "@/lib/growth";
import {
  facialAnalysisLabel,
  facialReasonLabel,
  formatAge,
  formatReading,
  type ScreeningReport,
} from "@/lib/screening";
import { Mascot } from "./mascot";

const CAPTURE_LABELS = {
  captured: "Kamera perangkat",
  skipped: "Kamera dinonaktifkan",
  failed: "Tidak berhasil diambil",
} as const;

export function Results({
  report,
  onFinish,
  awaitingStaffFinalize = false,
}: {
  report: ScreeningReport;
  onFinish?: () => void;
  awaitingStaffFinalize?: boolean;
}) {
  const [detail, setDetail] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const followUp = followUpForGrowthStatus(report.growthStatus);
  const facial = report.facialAnalysis;

  function save() {
    try {
      downloadReport(report);
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
        <div>
          <span>Hasil utama — pertumbuhan WHO</span>
          <strong>{growthStatusLabel(report.growthStatus)}</strong>
        </div>
        <div>
          <span>Status TB/U</span>
          <strong>{stuntingScreeningLabel(report.stuntingScreening)}</strong>
        </div>
        <p>
          {report.heightForAgeZ === null
            ? "TB/U belum dapat dihitung karena pembacaan tinggi badan belum tersedia atau tidak valid."
            : `TB/U Z-score WHO: ${report.heightForAgeZ}. Hasil ini adalah skrining, bukan diagnosis.`}
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
        {facial.status === "rejected" && (
          <p>{facialReasonLabel(facial.reason)}</p>
        )}
        <p>
          Analisis wajah hanya menjadi informasi pendukung dan tidak
          menentukan status stunting. Hasil utama tetap berasal dari TB/U WHO.
        </p>
      </div>

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
                <dd>{CAPTURE_LABELS[report.captureStatus]}</dd>
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
          <div className="clinical-detail">
            <h2>
              <Stethoscope size={21} />
              Langkah selanjutnya
            </h2>
            <ol>
              {followUp.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </>
      )}

      {!detail && (
        <button
          className="text-button detail-link"
          onClick={() => setDetail(true)}
        >
          Lihat dasar hasil & tindak lanjut
          <ArrowRight size={18} />
        </button>
      )}

      {awaitingStaffFinalize ? (
        <div className="growth-result">
          <div>
            <span>Status sesi</span>
            <strong>Menunggu petugas</strong>
          </div>
          <p>
            Hasil sudah tersimpan. Petugas akan menutup sesi dari dashboard,
            lalu alat kembali siap untuk pemeriksaan berikutnya.
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
        {awaitingStaffFinalize
          ? "Hasil juga tersedia pada akun orang tua yang terhubung."
          : saved
            ? "Laporan sudah diunduh (.txt)."
            : "Hasil juga tersedia di HP orang tua yang terhubung."}
      </p>
    </section>
  );
}
