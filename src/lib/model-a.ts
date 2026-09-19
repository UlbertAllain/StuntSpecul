"use client";

import type { FacialAnalysis } from "./screening";

type ModelAOkResponse = {
  status: "ok";
  classification: "stunting_indication" | "non_stunting_indication";
  probabilityStunting: number;
  threshold: number;
  modelVersion: string;
};

type ModelARejectResponse = {
  status: "reject";
  reason: string;
  modelVersion?: string;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(value: unknown): string | null {
  return record(value) && typeof value.message === "string"
    ? value.message
    : null;
}

function isReject(value: unknown): value is ModelARejectResponse {
  return (
    record(value) &&
    value.status === "reject" &&
    typeof value.reason === "string" &&
    (value.modelVersion === undefined || typeof value.modelVersion === "string")
  );
}

function isOk(value: unknown): value is ModelAOkResponse {
  return (
    record(value) &&
    value.status === "ok" &&
    (value.classification === "stunting_indication" ||
      value.classification === "non_stunting_indication") &&
    typeof value.probabilityStunting === "number" &&
    Number.isFinite(value.probabilityStunting) &&
    typeof value.threshold === "number" &&
    Number.isFinite(value.threshold) &&
    typeof value.modelVersion === "string"
  );
}

export async function analyzeFacePhoto(
  photo: Blob,
  ageMonths: number,
): Promise<FacialAnalysis> {
  const endpoint =
    process.env.NEXT_PUBLIC_MODEL_A_ENDPOINT || "/api/model-a-screening";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": photo.type || "image/jpeg",
      "X-Age-Months": String(ageMonths),
    },
    body: photo,
    cache: "no-store",
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Layanan analisis wajah tidak memberi respons yang valid.");
  }

  if (!response.ok) {
    throw new Error(
      errorMessage(payload) ?? "Layanan analisis wajah belum tersedia.",
    );
  }

  if (isReject(payload)) {
    return {
      status: "rejected",
      probability: null,
      threshold: null,
      reason: payload.reason,
      modelVersion: payload.modelVersion ?? "model-a-v2.1",
    };
  }

  if (!isOk(payload)) {
    throw new Error("Respons Model A tidak sesuai format yang diharapkan.");
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
