import { assessHeightForAge } from "@/lib/growth";
import { analyzeVisualWithGemini } from "@/server/gemini-vision";
import { ApiError, failure, ok, sameOrigin } from "@/server/http";
import { runtimeEnvironment } from "@/server/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_IMAGE_BYTES = 1_800_000;

function numberHeader(request: Request, name: string) {
  const raw = request.headers.get(name);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

async function readImage(request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0]?.trim() || "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
    throw new ApiError(415, "Gunakan gambar JPEG, PNG, atau WebP.");
  }

  const declared = Number(request.headers.get("content-length") || "0");
  if (declared > MAX_IMAGE_BYTES) {
    throw new ApiError(413, "Ukuran foto terlalu besar.");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Foto belum dikirim.");

  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new ApiError(413, "Ukuran foto terlalu besar.");
    }
    chunks.push(value);
  }

  if (!length) throw new ApiError(400, "Foto belum dikirim.");

  const image = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    image.set(chunk, offset);
    offset += chunk.length;
  }

  return { image, type };
}

async function handle(request: Request) {
  try {
    const env = runtimeEnvironment(request);
    sameOrigin(request, env);

    const ageMonths = numberHeader(request, "x-age-months");
    const heightCm = numberHeader(request, "x-height-cm");
    const weightKg = numberHeader(request, "x-weight-kg");
    const sex = request.headers.get("x-sex");

    if (
      ageMonths === null ||
      !Number.isInteger(ageMonths) ||
      ageMonths < 24 ||
      ageMonths > 59 ||
      heightCm === null ||
      heightCm < 30 ||
      heightCm > 200 ||
      weightKg === null ||
      weightKg < 1 ||
      weightKg > 100 ||
      (sex !== "male" && sex !== "female")
    ) {
      throw new ApiError(
        422,
        "Konteks pemeriksaan belum lengkap untuk analisis visual.",
        "visual_context_invalid",
      );
    }

    const { image, type } = await readImage(request);
    const growth = assessHeightForAge(ageMonths, sex, heightCm);
    const visualAnalysis = await analyzeVisualWithGemini(env, image, type, {
      ageMonths,
      sex,
      heightCm,
      weightKg,
      heightForAgeZ: growth.heightForAgeZ,
      growthStatus: growth.growthStatus,
    });

    return ok({
      visualAnalysis,
      context: {
        heightForAgeZ: growth.heightForAgeZ,
        growthStatus: growth.growthStatus,
      },
    });
  } catch (error) {
    return failure(error);
  }
}

export { handle as POST };
