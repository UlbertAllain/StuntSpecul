"use client";

import type { VisualAnalysis } from "./screening";

export type VisualAnalysisContext = {
  ageMonths: number;
  sex: "male" | "female";
};

export class VisualAnalysisRequestError extends Error {
  code: string;
  retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = "VisualAnalysisRequestError";
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

function visualPayload(value: unknown): VisualAnalysis | null {
  if (!record(value) || !record(value.data)) return null;
  const candidate = value.data.visualAnalysis;
  if (!record(candidate)) return null;

  const status = candidate.status;
  if (!["ok", "rejected", "unavailable"].includes(String(status))) return null;

  return candidate as unknown as VisualAnalysis;
}

async function requestVisualAnalysis(
  photo: Blob,
  context: VisualAnalysisContext,
): Promise<VisualAnalysis> {
  let response: Response;
  try {
    response = await fetch("/api/visual-analysis", {
      method: "POST",
      headers: {
        "Content-Type": photo.type || "image/jpeg",
        "X-Age-Months": String(context.ageMonths),
        "X-Sex": context.sex,
      },
      body: photo,
      cache: "no-store",
    });
  } catch {
    throw new VisualAnalysisRequestError(
      "Koneksi ke analisis visual terputus.",
      "visual_network_error",
      true,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new VisualAnalysisRequestError(
      "Layanan analisis visual memberi respons yang tidak valid.",
      "visual_invalid_response",
      response.status >= 500,
    );
  }

  if (!response.ok) {
    throw new VisualAnalysisRequestError(
      errorMessage(payload) ?? "Analisis visual belum tersedia.",
      errorCode(payload) ?? "visual_request_failed",
      response.status >= 500 || response.status === 429,
    );
  }

  const result = visualPayload(payload);
  if (!result) {
    throw new VisualAnalysisRequestError(
      "Respons analisis visual tidak sesuai format.",
      "visual_invalid_response",
    );
  }

  return result;
}

export async function analyzeVisualPhoto(
  photo: Blob,
  context: VisualAnalysisContext,
): Promise<VisualAnalysis> {
  return requestVisualAnalysis(photo, context);
}

export function visualAnalysisErrorReason(error: unknown): string {
  if (error instanceof VisualAnalysisRequestError) return error.code;
  return "visual_request_failed";
}
