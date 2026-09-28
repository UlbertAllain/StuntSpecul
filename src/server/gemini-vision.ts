import type {
  VisualAnalysis,
  VisualFacePosition,
  VisualLighting,
  VisualVisibility,
} from "../lib/screening";
import type { GrowthStatus } from "../lib/growth";
import type { Env } from "./env";
import { ApiError } from "./http";

export type VisualAnalysisContext = {
  ageMonths: number;
  sex: "male" | "female";
  heightCm: number;
  weightKg: number;
  heightForAgeZ: number | null;
  growthStatus: GrowthStatus;
};

const VISIBILITY = new Set<VisualVisibility>([
  "visible",
  "partial",
  "not_visible",
  "unclear",
]);
const POSITION = new Set<VisualFacePosition>([
  "frontal",
  "slightly_turned",
  "partial",
  "unclear",
]);
const LIGHTING = new Set<VisualLighting>([
  "good",
  "low",
  "bright",
  "uneven",
  "unclear",
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function visibility(value: unknown): VisualVisibility {
  return typeof value === "string" && VISIBILITY.has(value as VisualVisibility)
    ? (value as VisualVisibility)
    : "unclear";
}

function position(value: unknown): VisualFacePosition {
  return typeof value === "string" && POSITION.has(value as VisualFacePosition)
    ? (value as VisualFacePosition)
    : "unclear";
}

function lighting(value: unknown): VisualLighting {
  return typeof value === "string" && LIGHTING.has(value as VisualLighting)
    ? (value as VisualLighting)
    : "unclear";
}

function booleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function parseVisualAnalysis(
  value: unknown,
  modelVersion: string,
): VisualAnalysis {
  if (!record(value)) {
    throw new ApiError(
      503,
      "Analisis visual memberi respons yang tidak valid.",
      "visual_invalid_response",
    );
  }

  const observations = Array.isArray(value.observations)
    ? value.observations
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((item) => item.slice(0, 180))
    : [];

  const faceDetected = booleanOrNull(value.faceDetected);
  const singleFace = booleanOrNull(value.singleFace);
  const result: VisualAnalysis = {
    status:
      value.status === "ok" || value.status === "rejected"
        ? value.status
        : "unavailable",
    faceDetected,
    singleFace,
    eyes: visibility(value.eyes),
    nose: visibility(value.nose),
    mouth: visibility(value.mouth),
    facePosition: position(value.facePosition),
    lighting: lighting(value.lighting),
    observations,
    reason:
      typeof value.reason === "string" && value.reason.trim()
        ? value.reason.trim().slice(0, 180)
        : null,
    modelVersion,
  };

  if (faceDetected === false || singleFace === false) {
    result.status = "rejected";
  }

  return result;
}

async function providerFailure(response: Response): Promise<never> {
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  const providerMessage = payload?.error?.message?.toLowerCase() || "";
  let code = "visual_provider_error";
  let status = 503;

  if (response.status === 429) {
    code = "visual_quota_exceeded";
    status = 429;
  } else if (response.status === 401 || response.status === 403) {
    code = "visual_access_denied";
  } else if (response.status === 404) {
    code = "visual_model_unavailable";
  } else if (
    providerMessage.includes("api key") ||
    providerMessage.includes("api_key")
  ) {
    code = "visual_key_invalid";
  }

  console.error("Gemini visual analysis rejected", {
    providerStatus: response.status,
    code,
  });
  throw new ApiError(
    status,
    "Analisis visual sedang tidak tersedia. Hasil WHO tetap dapat digunakan.",
    code,
  );
}

export async function analyzeVisualWithGemini(
  env: Env,
  image: Uint8Array,
  mimeType: string,
  context: VisualAnalysisContext,
  fetcher: typeof fetch = fetch,
): Promise<VisualAnalysis> {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_MODEL?.trim().replace(/^models\//, "");

  if (!apiKey || !model) {
    throw new ApiError(
      503,
      "Analisis visual belum terhubung. Hasil WHO tetap dapat digunakan.",
      "visual_not_configured",
    );
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    throw new ApiError(
      503,
      "Model analisis visual tidak valid.",
      "visual_model_invalid",
    );
  }

  const prompt = [
    "Anda menganalisis FOTO WAJAH sebagai informasi visual pendukung StuntSpecula.",
    "",
    "ATURAN WAJIB:",
    "- Jangan menentukan, memprediksi, atau mengubah status stunting dari wajah.",
    "- Jangan memberi probabilitas stunting.",
    "- Status pertumbuhan WHO di bawah adalah hasil deterministik dari tinggi menurut umur dan hanya diberikan sebagai konteks.",
    "- Jangan menebak penyakit, kekurangan gizi, etnis, emosi, kecerdasan, atau kondisi medis dari wajah.",
    "- Tugas Anda hanya menilai apakah wajah dan area wajah terlihat serta kualitas foto.",
    "- observations harus deskripsi visual netral yang benar-benar tampak pada foto, maksimal 4 item.",
    "- Jika dapat dinilai, gunakan tiga observation dengan awalan persis: Kelopak mata:, Raut wajah:, dan Bibir:.",
    "- Raut wajah harus deskriptif secara visual dan tidak boleh menebak emosi, kondisi psikologis, penyakit, atau status gizi.",
    "- Jika tidak ada wajah atau ada lebih dari satu wajah, status harus rejected.",
    "- Balas JSON saja, tanpa markdown.",
    "",
    "KONTEKS PEMERIKSAAN:",
    "usiaBulan: " + context.ageMonths,
    "jenisKelamin: " + context.sex,
    "tinggiCm: " + context.heightCm,
    "beratKg: " + context.weightKg,
    "tbuZScoreWHO: " + (context.heightForAgeZ ?? "unavailable"),
    "statusWHO: " + context.growthStatus,
    "",
    "FORMAT JSON:",
    '{"status":"ok|rejected","faceDetected":true,"singleFace":true,"eyes":"visible|partial|not_visible|unclear","nose":"visible|partial|not_visible|unclear","mouth":"visible|partial|not_visible|unclear","facePosition":"frontal|slightly_turned|partial|unclear","lighting":"good|low|bright|uneven|unclear","observations":[],"reason":null}',
  ].join("\n");

  const response = await fetcher(
    "https://generativelanguage.googleapis.com/v1beta/models/" +
      model +
      ":generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: Buffer.from(image).toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 450,
          responseMimeType: "application/json",
        },
      }),
    },
  ).catch((error: unknown) => {
    const timeout =
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name);
    throw new ApiError(
      503,
      timeout
        ? "Analisis visual belum merespons. Hasil WHO tetap dapat digunakan."
        : "Analisis visual sedang tidak tersedia. Hasil WHO tetap dapat digunakan.",
      timeout ? "visual_timeout" : "visual_network_error",
    );
  });

  if (!response.ok) return providerFailure(response);

  const payload = (await response.json()) as {
    candidates?: {
      content?: { parts?: { text?: string; thought?: boolean }[] };
      finishReason?: string;
    }[];
  };
  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts
    ?.filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("")
    .trim();

  if (!text || candidate?.finishReason === "SAFETY") {
    throw new ApiError(
      422,
      "Foto belum dapat dianalisis. Silakan ambil ulang.",
      "visual_no_answer",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(
      503,
      "Analisis visual memberi respons yang tidak valid.",
      "visual_invalid_response",
    );
  }

  return parseVisualAnalysis(parsed, "gemini:" + model);
}
