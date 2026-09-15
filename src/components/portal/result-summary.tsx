import { Ruler, Scale, ScanFace, Info, Stethoscope } from "lucide-react";
import {
  followUpForGrowthStatus,
  growthStatusLabel,
  stuntingScreeningLabel,
} from "@/lib/growth";
import { formatAge, formatReading } from "@/lib/screening";
import type { Examination, ParentView } from "@/lib/portal";

export function ResultSummary({
  result,
}: {
  result: Examination | ParentView["result"];
}) {
  const followUp = followUpForGrowthStatus(result.growthStatus);
  const stuntingScreening =
    result.growthStatus === "severely_stunted"
      ? "severe"
      : result.growthStatus === "stunted"
        ? "indicated"
        : result.growthStatus === "monitor"
          ? "monitor"
          : result.growthStatus === "within_range"
            ? "not_indicated"
            : null;

  return (
    <>
      <div className="result-person">
        <div>
          <span>HASIL PEMERIKSAAN</span>
          <h2>{result.childName}</h2>
          <p>
            {formatAge(result.ageMonths)} ·{" "}
            {result.sex === "male" ? "Laki-laki" : "Perempuan"}
          </p>
        </div>
        <time>
          {new Date(result.completedAt || result.createdAt).toLocaleDateString(
            "id-ID",
            { day: "numeric", month: "long", year: "numeric" },
          )}
        </time>
      </div>
      <div className="portal-measurements">
        <div>
          <Ruler />
          <span>Tinggi badan</span>
          <strong>
            {formatReading(result.heightCm)} <small>cm</small>
          </strong>
        </div>
        <div>
          <Scale />
          <span>Berat badan</span>
          <strong>
            {formatReading(result.weightKg)} <small>kg</small>
          </strong>
        </div>
      </div>
      <div className="portal-card result-status">
        <Info />
        <div>
          <h3>{growthStatusLabel(result.growthStatus)}</h3>
          {result.heightForAgeZ === null ? (
            <p>
              Tinggi menurut umur belum dapat dihitung. Pastikan pembacaan
              tinggi badan tersedia dan valid.
            </p>
          ) : (
            <p>
              TB/U Z-score WHO: <strong>{result.heightForAgeZ}</strong>.
              Skrining stunting:{" "}
              <strong>{stuntingScreeningLabel(stuntingScreening)}</strong>.
            </p>
          )}
        </div>
      </div>
      <div className="portal-card">
        <h3>
          <Stethoscope /> Langkah selanjutnya
        </h3>
        <ol className="portal-follow-up">
          {followUp.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="portal-note">
          Ini hasil skrining, bukan diagnosis. Konfirmasi hasil yang terindikasi
          stunting kepada tenaga kesehatan.
        </p>
      </div>
      <div className="portal-card">
        <h3>
          <ScanFace /> Analisis wajah
        </h3>
        <dl className="portal-details">
          <div>
            <dt>Area mata</dt>
            <dd>Belum tersedia</dd>
          </div>
          <div>
            <dt>Kantong mata</dt>
            <dd>Belum tersedia</dd>
          </div>
          <div>
            <dt>Kondisi bibir</dt>
            <dd>Belum tersedia</dd>
          </div>
        </dl>
        <p className="portal-note">
          Indikator wajah ditampilkan terpisah dan tidak menentukan status
          stunting.
        </p>
      </div>
    </>
  );
}
