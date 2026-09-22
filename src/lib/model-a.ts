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

export class ModelARequestError extends Error {
  code: string;
  retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = "ModelARequestError";
    this.code = code;
    this.retryable = retryable;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(value: unknown): string | null {
  return record(value) && typeof value.message === "string"
    ? value.message
    : null;
}

function errorCode(value: unknown): string | null {
  return record(value) && typeof value.code === "string" ? value.code : null;
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

async function requestAnalysis(
  photo: Blob,
  ageMonths: number,
): Promise<FacialAnalysis> {
  const endpoint =
    process.env.NEXT_PUBLIC_MODEL_A_ENDPOINT || "/api/model-a-screening";

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": photo.type || "image/jpeg",
        "X-Age-Months": String(ageMonths),
      },
      body: photo,
      cache: "no-store",
    });
  } catch {
    throw new ModelARequestError(
      "Koneksi ke layanan Model A terputus.",
      "network_error",
      true,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ModelARequestError(
      "Layanan Model A memberi respons yang tidak valid.",
      "invalid_response",
      response.status >= 500,
    );
  }

  if (!response.ok) {
    let code = errorCode(payload) ?? "model_request_failed";
    if (!errorCode(payload)) {
      if (response.status === 413) code = "request_too_large";
      else if (response.status >= 500) code = "model_server_error";
    }

    throw new ModelARequestError(
      errorMessage(payload) ?? "Layanan analisis wajah belum tersedia.",
      code,
      response.status >= 500 || response.status === 429,
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
    throw new ModelARequestError(
      "Respons Model A tidak sesuai format yang diharapkan.",
      "invalid_response",
    );
  }

  return {
    status: payload.classification,
    probability: payload.probabilityStunting,
    threshold: payload.threshold,
    reason: null,
    modelVersion: payload.modelVersion,
  };
}

export async function analyzeFacePhoto(
  photo: Blob,
  ageMonths: number,
): Promise<FacialAnalysis> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestAnalysis(photo, ageMonths);
    } catch (error) {
      lastError = error;
      const shouldRetry =
        error instanceof ModelARequestError && error.retryable && attempt === 0;

      if (!shouldRetry) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
  }

  throw lastError;
}

export function modelAErrorReason(error: unknown): string {
  if (error instanceof ModelARequestError) return error.code;
  return "model_request_failed";
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
