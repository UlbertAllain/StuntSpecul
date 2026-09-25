import type { GrowthStatus } from "./growth.ts";

export const GROWTH_RECOMMENDATION_VERSION = "growth-rec-v1";

export type GrowthRecommendations = {
  version: typeof GROWTH_RECOMMENDATION_VERSION;
  basedOn: GrowthStatus;
  nutrition: string[];
  nextSteps: string[];
};

export function growthRecommendationsFor(
  status: GrowthStatus,
): GrowthRecommendations {
  switch (status) {
    case "severely_stunted":
      return {
        version: GROWTH_RECOMMENDATION_VERSION,
        basedOn: status,
        nutrition: [
          "Utamakan makanan beragam dan padat gizi dengan sumber protein hewani seperti telur, ikan, ayam, daging, atau susu/olahannya sesuai toleransi anak.",
          "Lengkapi makan utama dengan sumber karbohidrat, sayur, buah, serta lemak sehat; hindari mengganti makan utama dengan minuman manis atau camilan rendah gizi.",
          "Pertahankan jadwal makan teratur dan perhatikan nafsu makan anak. Bila anak sulit makan terus-menerus, sampaikan saat konsultasi.",
        ],
        nextSteps: [
          "Ulangi pengukuran tinggi dengan posisi yang benar untuk memastikan hasil.",
          "Jadwalkan penilaian di Posyandu, Puskesmas, dokter, atau tenaga kesehatan untuk konfirmasi pertumbuhan dan mencari faktor penyebab.",
          "Bawa riwayat hasil sebelumnya dan diskusikan pola makan, penyakit berulang, perkembangan, serta kondisi lingkungan anak.",
          "Jika anak tampak sangat lemas, sulit makan atau minum, atau sedang sakit berat, cari pertolongan medis segera.",
        ],
      };
    case "stunted":
      return {
        version: GROWTH_RECOMMENDATION_VERSION,
        basedOn: status,
        nutrition: [
          "Berikan makanan beragam dan padat gizi dengan sumber protein hewani secara rutin, misalnya telur, ikan, ayam, daging, atau susu/olahannya sesuai toleransi anak.",
          "Lengkapi menu dengan karbohidrat, sayur, buah, dan lemak sehat agar kebutuhan energi dan zat gizi lebih beragam.",
          "Batasi minuman manis dan makanan tinggi gula, garam, atau lemak trans yang dapat menggantikan makanan bergizi.",
        ],
        nextSteps: [
          "Ulangi pengukuran tinggi dengan posisi yang benar untuk memastikan hasil.",
          "Bawa hasil ini ke Posyandu, Puskesmas, dokter, atau tenaga kesehatan untuk penilaian pertumbuhan dan penyebab yang mungkin mendasari.",
          "Pantau tinggi dan berat secara berkala serta diskusikan pola makan, riwayat penyakit, sanitasi, dan perkembangan anak dengan tenaga kesehatan.",
        ],
      };
    case "monitor":
      return {
        version: GROWTH_RECOMMENDATION_VERSION,
        basedOn: status,
        nutrition: [
          "Pertahankan pola makan beragam dengan sumber protein hewani, sayur, buah, karbohidrat, dan lemak sehat.",
          "Jaga jadwal makan teratur dan pilih camilan bergizi agar asupan utama tidak tergantikan makanan atau minuman tinggi gula.",
          "Pastikan makanan diolah dan disajikan dengan kebersihan yang baik.",
        ],
        nextSteps: [
          "Pantau tinggi dan berat secara berkala dan bandingkan tren antar pemeriksaan.",
          "Ulangi pengukuran bila posisi anak saat pemeriksaan kurang ideal atau hasil terasa tidak sesuai.",
          "Konsultasikan ke tenaga kesehatan bila pertumbuhan melambat, berat tidak bertambah, nafsu makan menurun terus-menerus, atau ada keluhan kesehatan lain.",
        ],
      };
    case "within_range":
      return {
        version: GROWTH_RECOMMENDATION_VERSION,
        basedOn: status,
        nutrition: [
          "Pertahankan pola makan beragam dan seimbang dengan sumber protein hewani, sayur, buah, karbohidrat, dan lemak sehat.",
          "Utamakan air putih dan batasi minuman manis serta makanan tinggi gula, garam, atau lemak trans.",
          "Pertahankan jadwal makan yang teratur dan kebiasaan makan responsif tanpa memaksa anak.",
        ],
        nextSteps: [
          "Lanjutkan pemantauan pertumbuhan secara rutin di Posyandu atau fasilitas kesehatan.",
          "Simpan hasil ini untuk dibandingkan dengan pemeriksaan berikutnya.",
          "Konsultasikan bila muncul perubahan pola makan, penyakit berulang, atau pertumbuhan tampak melambat.",
        ],
      };
    default:
      return {
        version: GROWTH_RECOMMENDATION_VERSION,
        basedOn: status,
        nutrition: [
          "Pertahankan pola makan beragam dan seimbang sesuai usia sambil menunggu hasil pengukuran yang valid.",
        ],
        nextSteps: [
          "Ulangi pengukuran tinggi badan dengan posisi yang benar karena TB/U belum dapat dihitung.",
          "Konsultasikan ke petugas kesehatan bila pengukuran berulang tetap tidak sesuai atau ada keluhan pertumbuhan.",
        ],
      };
  }
}
