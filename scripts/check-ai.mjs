import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvFile } from "node:process";

// Use the same adapter as the API, without patient data, sessions or a running database.
try {
  loadEnvFile(".dev.vars");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const directory = await mkdtemp(join(tmpdir(), "stuntspecula-ai-"));
try {
  const entrypoint = join(directory, "gemini.mjs");
  await build({
    entryPoints: ["src/server/gemini.ts"],
    outfile: entrypoint,
    bundle: true,
    format: "esm",
    platform: "node",
  });
  const { geminiExplainer } = await import(pathToFileURL(entrypoint));
  console.log("Memeriksa Gemini dengan satu pertanyaan tanpa data pasien…");
  const answer = await geminiExplainer(process.env).explain(
    {
      ageMonths: 36,
      sex: "male",
      heightCm: null,
      weightKg: null,
      bmi: null,
      growthStatus: "unavailable",
      captureStatus: "skipped",
      completedAt: null,
    },
    [],
    "Data pengukuran belum tersedia. Jelaskan dalam satu kalimat.",
  );
  console.log("BERHASIL: Gemini mengembalikan jawaban teks.");
  console.log(`Panjang jawaban: ${answer.length} karakter.`);
} catch (error) {
  if (typeof error.code === "string" && error.code.startsWith("ai_")) {
    console.error(`${error.code}: ${error.message}`);
  } else {
    console.error(
      "Pemeriksaan gagal sebelum jawaban dapat dibaca. Periksa instalasi dan koneksi Node.js.",
    );
  }
  process.exitCode = 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
