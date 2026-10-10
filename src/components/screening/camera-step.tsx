"use client";

import { useEffect, useRef } from "react";
import { Camera, Check, RotateCcw } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { useCountdown } from "@/hooks/use-countdown";
import { playMimoCountdownCue } from "@/lib/mimo-audio";
import type { Capture } from "@/lib/screening";

type CameraStepProps = {
  paused: boolean;
  ageMonths: number;
  sex: "male" | "female";
  soundEnabled?: boolean;
  displayOnlyControls?: boolean;
  remoteControl?: {
    id: string;
    action: "retry_camera" | "skip_camera";
  } | null;
  onRecoveryState?: (input: {
    attention: "camera_retry_required" | null;
    message: string | null;
  }) => void;
  onControlApplied?: (controlId: string) => void;
  onComplete: (capture: Capture) => void;
};

function CaptureCountdown({
  paused,
  soundEnabled,
  onComplete,
}: {
  paused: boolean;
  soundEnabled: boolean;
  onComplete: () => void;
}) {
  const remaining = useCountdown(4, paused, onComplete);

  useEffect(() => {
    if (!soundEnabled || paused) return;
    playMimoCountdownCue(remaining);
  }, [remaining, paused, soundEnabled]);

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

export function CameraStep({
  paused,
  ageMonths,
  sex,
  soundEnabled = false,
  displayOnlyControls = false,
  remoteControl = null,
  onRecoveryState,
  onControlApplied,
  onComplete,
}: CameraStepProps) {
  const { videoRef, status, attempt, capture, error, retry } = useCamera(
    onComplete,
    { ageMonths, sex },
  );
  const appliedControlRef = useRef<string | null>(null);

  useEffect(() => {
    onRecoveryState?.({
      attention: status === "error" ? "camera_retry_required" : null,
      message: status === "error" ? error : null,
    });
  }, [error, onRecoveryState, status]);

  useEffect(() => {
    if (!remoteControl || appliedControlRef.current === remoteControl.id)
      return;

    appliedControlRef.current = remoteControl.id;
    if (remoteControl.action === "retry_camera") {
      retry();
    } else {
      onComplete({ status: "failed" });
    }
    onControlApplied?.(remoteControl.id);
  }, [onComplete, onControlApplied, remoteControl, retry]);

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
            soundEnabled={soundEnabled}
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
        {status === "analyzing" && (
          <div className="camera-message" role="status">
            Menganalisis kualitas wajah sebagai data pendukung…
          </div>
        )}
        {status === "error" && (
          <div className="camera-message" role="alert">
            <Camera size={35} />
            <strong>Kamera belum siap</strong>
            <span>{error}</span>
          </div>
        )}
      </div>
      <p className="camera-direction">
        Wajah di tengah. Lihat lurus. Tetap diam sebentar.
      </p>
      <div className="facial-targets">
        <span>Wajah di tengah</span>
        <span>Cahaya cukup</span>
        <span>Satu anak saja</span>
      </div>
      {status === "error" && !displayOnlyControls && (
        <div className="camera-recovery">
          <button className="secondary-button" onClick={retry}>
            <RotateCcw size={18} />
            Ambil ulang
          </button>
          <button
            className="text-button"
            onClick={() => onComplete({ status: "failed" })}
          >
            Lanjut tanpa analisis wajah
          </button>
        </div>
      )}
      {status === "error" && displayOnlyControls && (
        <p className="camera-remote-notice" role="status">
          Pemeriksaan dijeda. Gunakan kontrol pada halaman orang tua/petugas
          untuk mengambil ulang atau melanjutkan tanpa analisis wajah.
        </p>
      )}
    </div>
  );
}
