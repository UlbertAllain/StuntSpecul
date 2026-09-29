"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  TestTubeDiagonal,
} from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import {
  assessHeightForAge,
  growthStatusLabel,
  stuntingScreeningLabel,
} from "@/lib/growth";
import {
  visualAnalysisStatusLabel,
  visualFacePositionLabel,
  visualLightingLabel,
  visualVisibilityLabel,
  type Capture,
} from "@/lib/screening";
import type { VisualAnalysisContext } from "@/lib/visual-analysis";
import { Message } from "../shared/shell";

function FaceTestCamera({
  context,
  onCapture,
  onCancel,
}: {
  context: VisualAnalysisContext;
  onCapture: (capture: Capture) => void;
  onCancel: () => void;
}) {
  const { videoRef, status, attempt, capture, error, retry } = useCamera(
    onCapture,
    context,
  );

  return (
    <section className="ref-card face-test-camera-card">
      <div className="ref-card-title">
        <span>
          <Camera />
        </span>
        <div>
          <h3>Kamera pengujian</h3>
          <p>Foto hanya dipakai untuk pengujian sesi ini.</p>
        </div>
      </div>

      <div className="face-test-camera">
        <video
          key={attempt}
          ref={videoRef}
          muted
          autoPlay
          playsInline
          aria-label="Pratinjau kamera pengujian wajah"
        />
        <div className="face-test-guide" aria-hidden="true" />
        {status !== "ready" && (
          <div className="face-test-camera-status">
            {status === "connecting" && "Menghubungkan kamera…"}
            {status === "capturing" && "Mengambil foto…"}
            {status === "analyzing" && "Gemini sedang menganalisis…"}
            {status === "error" && (error || "Kamera belum siap.")}
          </div>
        )}
      </div>

      <div className="face-test-actions">
        {status === "error" ? (
          <button className="portal-secondary" onClick={retry}>
            <RotateCcw size={17} />
            Coba kamera lagi
          </button>
        ) : (
          <button
            className="portal-primary"
            disabled={status !== "ready"}
            onClick={capture}
          >
            <ScanFace size={17} />
            Ambil dan analisis
          </button>
        )}
        <button className="portal-text" onClick={onCancel}>
          Batal
        </button>
      </div>
    </section>
  );
}

export function FaceTestPanel() {
  const [context, setContext] = useState<VisualAnalysisContext | null>(null);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const growth = useMemo(
    () =>
      context
        ? assessHeightForAge(
            context.ageMonths,
            context.sex,
            context.heightCm,
          )
        : null,
    [context],
  );

  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );

  function handleCapture(nextCapture: Capture) {
    setCapture(nextCapture);
    setPhotoUrl(
      nextCapture.status === "captured"
        ? URL.createObjectURL(nextCapture.photo)
        : null,
    );
  }

  function startTest(form: HTMLFormElement) {
    const data = new FormData(form);
    const ageMonths = Number(data.get("ageMonths"));
    const heightCm = Number(data.get("heightCm"));
    const weightKg = Number(data.get("weightKg"));
    const sex = data.get("sex");

    if (
      !Number.isInteger(ageMonths) ||
      ageMonths < 24 ||
      ageMonths > 59 ||
      !Number.isFinite(heightCm) ||
      heightCm < 30 ||
      heightCm > 200 ||
      !Number.isFinite(weightKg) ||
      weightKg < 1 ||
      weightKg > 100 ||
      (sex !== "male" && sex !== "female")
    ) {
      return;
    }

    setCapture(null);
    setContext({ ageMonths, sex, heightCm, weightKg });
  }

  const visual =
    capture?.status === "captured" ? capture.visualAnalysis ?? null : null;

  return (
    <>
      <div className="section-heading compact-section-heading">
        <div>
          <h2>Pengujian wajah</h2>
          <p className="portal-note">
            Uji kamera dan Gemini tanpa menunggu sensor. Data manual di halaman
            ini tidak membuat pemeriksaan dan tidak masuk riwayat pasien.
          </p>
        </div>
      </div>

      <Message>
        Mode ini khusus kalibrasi dan pengembangan. Tinggi serta berat diisi
        manual hanya sebagai konteks pengujian.
      </Message>

      <div className="face-test-grid">
        <section className="ref-card">
          <div className="ref-card-title">
            <span>
              <TestTubeDiagonal />
            </span>
            <div>
              <h3>Konteks pengujian</h3>
              <p>Gunakan nilai realistis agar hasil WHO dapat ikut dicek.</p>
            </div>
          </div>

          <form
            className="profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              startTest(event.currentTarget);
            }}
          >
            <label>
              Usia anak
              <div className="face-test-input-unit">
                <input
                  name="ageMonths"
                  type="number"
                  min={24}
                  max={59}
                  step={1}
                  required
                  placeholder="Contoh: 39"
                />
                <span>bulan</span>
              </div>
            </label>

            <label>
              Jenis kelamin
              <select name="sex" defaultValue="male" required>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </label>

            <label>
              Tinggi badan manual
              <div className="face-test-input-unit">
                <input
                  name="heightCm"
                  type="number"
                  min={30}
                  max={200}
                  step="0.1"
                  required
                  placeholder="Contoh: 92.5"
                />
                <span>cm</span>
              </div>
            </label>

            <label>
              Berat badan manual
              <div className="face-test-input-unit">
                <input
                  name="weightKg"
                  type="number"
                  min={1}
                  max={100}
                  step="0.1"
                  required
                  placeholder="Contoh: 14.5"
                />
                <span>kg</span>
              </div>
            </label>

            <button className="portal-primary">
              <Camera size={17} />
              Mulai kamera
            </button>
          </form>
        </section>

        {context && !capture && (
          <FaceTestCamera
            context={context}
            onCapture={handleCapture}
            onCancel={() => setContext(null)}
          />
        )}

        {!context && (
          <section className="ref-card face-test-placeholder">
            <ScanFace />
            <strong>Kamera belum dimulai</strong>
            <p>
              Isi konteks anak di sebelah kiri, lalu tekan Mulai kamera. Sensor
              ESP32 tidak diperlukan pada mode ini.
            </p>
          </section>
        )}
      </div>

      {capture?.status === "captured" && (
        <section className="ref-card face-test-result">
          <div className="ref-card-title">
            <span>
              <ShieldCheck />
            </span>
            <div>
              <h3>Hasil pengujian</h3>
              <p>
                Foto dan hasil berikut hanya hidup pada halaman ini dan tidak
                disimpan ke examination.
              </p>
            </div>
          </div>

          <div className="face-test-result-grid">
            {photoUrl && (
              <div
                className="face-test-photo"
                role="img"
                aria-label="Foto hasil pengujian wajah"
                style={{ backgroundImage: `url("${photoUrl}")` }}
              />
            )}

            <div className="face-test-result-detail">
              <dl>
                <div>
                  <dt>Status foto</dt>
                  <dd>
                    {visual
                      ? visualAnalysisStatusLabel(visual.status)
                      : "Belum tersedia"}
                  </dd>
                </div>
                <div>
                  <dt>Mata</dt>
                  <dd>
                    {visual
                      ? visualVisibilityLabel(visual.eyes)
                      : "Belum tersedia"}
                  </dd>
                </div>
                <div>
                  <dt>Hidung</dt>
                  <dd>
                    {visual
                      ? visualVisibilityLabel(visual.nose)
                      : "Belum tersedia"}
                  </dd>
                </div>
                <div>
                  <dt>Mulut</dt>
                  <dd>
                    {visual
                      ? visualVisibilityLabel(visual.mouth)
                      : "Belum tersedia"}
                  </dd>
                </div>
                <div>
                  <dt>Posisi wajah</dt>
                  <dd>
                    {visual
                      ? visualFacePositionLabel(visual.facePosition)
                      : "Belum tersedia"}
                  </dd>
                </div>
                <div>
                  <dt>Pencahayaan</dt>
                  <dd>
                    {visual
                      ? visualLightingLabel(visual.lighting)
                      : "Belum tersedia"}
                  </dd>
                </div>
              </dl>

              {visual?.observations.length ? (
                <div className="face-test-observations">
                  <strong>Detail visual Gemini</strong>
                  <ul>
                    {visual.observations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="face-test-who">
                <span>PREVIEW TB/U WHO</span>
                <strong>
                  {growth
                    ? stuntingScreeningLabel(growth.stuntingScreening)
                    : "Belum tersedia"}
                </strong>
                <small>
                  {growth
                    ? `${growthStatusLabel(growth.growthStatus)} · Z-score ${growth.heightForAgeZ ?? "—"}`
                    : "Belum tersedia"}
                </small>
              </div>
            </div>
          </div>

          <div className="face-test-actions">
            <button
              className="portal-primary"
              onClick={() => {
                setCapture(null);
                setPhotoUrl(null);
                setContext(null);
              }}
            >
              Pengujian baru
            </button>
          </div>
        </section>
      )}
    </>
  );
}
