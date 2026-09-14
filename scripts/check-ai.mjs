import { loadEnvironment, withServerModule } from "./server-module.mjs";

loadEnvironment();
try {
  await withServerModule(
    "src/server/gemini.ts",
    async ({ geminiExplainer }) => {
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
    },
  );
} catch (error) {
  if (typeof error.code === "string" && error.code.startsWith("ai_")) {
    console.error(`${error.code}: ${error.message}`);
  } else {
    console.error(
      "Pemeriksaan gagal sebelum jawaban dapat dibaca. Periksa instalasi dan koneksi Node.js.",
    );
  }
  process.exitCode = 1;
}
