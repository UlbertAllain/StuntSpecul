import { Ruler, Scale, ScanFace, Info } from "lucide-react";
import { formatAge, formatReading } from "@/lib/screening";
import type { Examination, ParentView } from "@/lib/portal";

export function ResultSummary({
  result,
}: {
  result: Examination | ParentView["result"];
}) {
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
          <h3>Status pertumbuhan belum tersedia</h3>
          <p>
            Penilaian menunggu hasil ukur dan layanan yang valid. Data yang
            kosong belum dapat disimpulkan sebagai hasil normal.
          </p>
        </div>
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
          Indikator wajah ditampilkan terpisah dari penilaian pertumbuhan.
        </p>
      </div>
    </>
  );
}
