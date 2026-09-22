"use client";

import { useEffect, useRef, useState } from "react";
import { captureFrame, requestCamera, stopCamera } from "@/lib/camera";
import { analyzeFacePhoto, modelAErrorReason } from "@/lib/model-a";
import { UNAVAILABLE_FACIAL_ANALYSIS, type Capture } from "@/lib/screening";

const CAMERA_TIMEOUT_MS = 15_000;
type CameraStatus =
  | "connecting"
  | "ready"
  | "capturing"
  | "analyzing"
  | "error";

export function useCamera(
  onCapture: (capture: Capture) => void,
  ageMonths: number,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<CameraStatus>("connecting");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    let timedOut = false;
    let detachTracks = () => {};
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
      stopCamera(streamRef.current);
      setError("Kamera belum merespons. Periksa izin kamera, lalu coba lagi.");
      setStatus("error");
    }, CAMERA_TIMEOUT_MS);

    async function connect() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Kamera memerlukan HTTPS atau localhost.");
        }
        const stream = await requestCamera(controller.signal, () =>
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 960 },
              height: { ideal: 1280 },
            },
            audio: false,
          }),
        );
        if (controller.signal.aborted) {
          stopCamera(stream);
          return;
        }
        streamRef.current = stream;
        const onDisconnected = () => {
          if (controller.signal.aborted) return;
          stopCamera(stream);
          setError("Kamera terputus. Hubungkan kembali lalu coba lagi.");
          setStatus("error");
        };
        stream
          .getVideoTracks()
          .forEach((track) => track.addEventListener("ended", onDisconnected));
        detachTracks = () =>
          stream
            .getVideoTracks()
            .forEach((track) =>
              track.removeEventListener("ended", onDisconnected),
            );
        const video = videoRef.current;
        if (!video) throw new Error("Pratinjau kamera belum siap.");
        video.srcObject = stream;
        await video.play();
        if (!controller.signal.aborted) setStatus("ready");
      } catch (cause) {
        if (!controller.signal.aborted) {
          stopCamera(streamRef.current);
          setError(
            cause instanceof Error && cause.name === "NotAllowedError"
              ? "Izin kamera belum diberikan. Periksa pengaturan browser."
              : "Kamera tidak tersedia. Periksa perangkat dan coba lagi.",
          );
          setStatus("error");
        }
      } finally {
        if (!timedOut) clearTimeout(timeout);
      }
    }

    void connect();
    return () => {
      clearTimeout(timeout);
      controller.abort();
      detachTracks();
      stopCamera(streamRef.current);
      streamRef.current = null;
    };
  }, [attempt]);

  function retry() {
    setError("");
    setStatus("connecting");
    setAttempt((value) => value + 1);
  }

  async function capture() {
    const controller = controllerRef.current;
    const video = videoRef.current;
    if (
      !controller ||
      controller.signal.aborted ||
      !video ||
      status !== "ready"
    )
      return;

    setStatus("capturing");
    let photo: Blob | null = null;
    try {
      photo = await captureFrame(video);
      if (controller.signal.aborted) return;

      setStatus("analyzing");
      const facialAnalysis = await analyzeFacePhoto(photo, ageMonths);
      if (controller.signal.aborted) return;

      stopCamera(streamRef.current);
      onCapture({ status: "captured", photo, facialAnalysis });
    } catch (cause) {
      if (!controller.signal.aborted) {
        // Facial AI is supporting data only. A model/service failure must never
        // block the WHO anthropometric screening flow.
        stopCamera(streamRef.current);
        if (!photo) {
          setError("Gambar belum berhasil diambil. Silakan coba lagi.");
          setStatus("error");
          return;
        }
        onCapture({
          status: "captured",
          photo,
          facialAnalysis: {
            ...UNAVAILABLE_FACIAL_ANALYSIS,
            reason: modelAErrorReason(cause),
            modelVersion: "model-a-v2.1",
          },
        });
      }
    }
  }

  return { videoRef, attempt, status, error, retry, capture };
}
