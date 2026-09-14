"use client";

import { Camera, Check, RotateCcw } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import type { Capture } from "@/lib/screening";

type CameraStepProps = {
  paused: boolean;
  onComplete: (capture: Capture) => void;
};

function CaptureCountdown({
  paused,
  onComplete,
}: {
  paused: boolean;
  onComplete: () => void;
}) {
  const remaining = useCountdown(6, paused, onComplete);
  return (
    <div
      className="capture-count"
      role="timer"
      aria-label="Waktu pengambilan wajah"
    >
      {paused ? "Ⅱ" : remaining > 3 ? <Check size={27} /> : remaining}
    </div>
  );
}

export function CameraStep({ paused, onComplete }: CameraStepProps) {
  const { videoRef, status, attempt, capture, error, retry } =
    useCamera(onComplete);

  return (
    <div className="camera-step">
      <div className="camera-window real-camera">
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          aria-label="Pratinjau posisi wajah"
        />
        <div className="face-guide" aria-hidden="true" />
        <span className="camera-label">
          <Camera size={16} />
          KAMERA
        </span>
        {status === "ready" && (
          <CaptureCountdown
            key={attempt}
            paused={paused}
            onComplete={capture}
          />
        )}
        {status === "connecting" && (
          <div className="camera-message" role="status">
            Menghubungkan kamera…
          </div>
        )}
        {status === "capturing" && (
          <div className="camera-message" role="status">
            Mengambil gambar…
          </div>
        )}
        {status === "error" && (
          <div className="camera-message" role="alert">
            <Camera size={35} />
            <strong>Kamera belum tersedia</strong>
            <span>{error}</span>
          </div>
        )}
      </div>
      <p className="camera-direction">
        Wajah di tengah. Mata terbuka. Bibir rileks.
      </p>
      <div className="facial-targets">
        <span>Area mata</span>
        <span>Kantong mata</span>
        <span>Bibir</span>
      </div>
      {status === "error" && (
        <div className="camera-recovery">
          <button className="secondary-button" onClick={retry}>
            <RotateCcw size={18} />
            Coba lagi
          </button>
          <button
            className="text-button"
            onClick={() => onComplete({ status: "failed" })}
          >
            Lanjut tanpa analisis wajah
          </button>
        </div>
      )}
      <p className="parent-caption">
        Pendamping, bantu posisikan wajah di tengah.
      </p>
    </div>
  );
}
