"use client";

import type { FacialAnalysis } from "./screening";

type ModelAResponse =
  | {
      status: "ok";
      classification: "stunting_indication" | "non_stunting_indication";
      probabilityStunting: number;
      threshold: number;
      modelVersion: string;
    }
  | {
      status: "reject";
      reason: string;
      modelVersion?: string;
    };

export async function analyzeFacePhoto(
  photo: Blob,
  ageMonths: number,
): Promise<FacialAnalysis> {
  const response = await fetch("/api/model-a-screening", {
    method: "POST",
    headers: {
      "Content-Type": photo.type || "image/jpeg",
      "X-Age-Months": String(ageMonths),
    },
    body: photo,
    cache: "no-store",
  });

  let payload: ModelAResponse | { message?: string };
  try {
    payload = (await response.json()) as ModelAResponse | { message?: string };
  } catch {
    throw new Error("Layanan analisis wajah tidak memberi respons yang valid.");
  }

  if (!response.ok) {
    throw new Error(
      "message" in payload && payload.message
        ? payload.message
        : "Layanan analisis wajah belum tersedia.",
    );
  }

  if (payload.status === "reject") {
    return {
      status: "rejected",
      probability: null,
      threshold: null,
      reason: payload.reason,
      modelVersion: payload.modelVersion ?? "model-a-v2.1",
    };
  }

  return {
    status: payload.classification,
    probability: payload.probabilityStunting,
    threshold: payload.threshold,
    reason: null,
    modelVersion: payload.modelVersion,
  };
}

export function faceRetryMessage(reason: string | null): string {
  switch (reason) {
    case "blur":
      return "Foto terlalu buram. Tetap diam sebentar lalu coba lagi.";
    case "too_dark":
      return "Wajah terlalu gelap. Tambahkan cahaya lalu coba lagi.";
    case "too_bright":
      return "Cahaya terlalu terang. Hindari lampu langsung ke wajah.";
    case "no_face":
      return "Wajah belum terbaca. Posisikan wajah di tengah lalu coba lagi.";
    case "multiple_faces":
      return "Pastikan hanya satu anak berada di area kamera.";
    case "face_too_small":
      return "Wajah terlalu jauh. Dekatkan posisi anak ke kamera.";
    case "age_out_of_scope":
      return "Analisis wajah hanya digunakan untuk anak usia 24–59 bulan.";
    default:
      return "Foto belum dapat dianalisis. Atur posisi lalu coba lagi.";
  }
}
