import type { GrowthStatus } from "./growth.ts";
import {
  stuntingRiskFor,
  type StuntingRiskAssessment,
  type StuntingRiskPoint,
} from "./stunting-risk.ts";

export const GROWTH_RECOMMENDATION_VERSION = "growth-rec-v3";
export const LOCAL_NUTRITION_VERSION = "nutrition-id-v1";
export const KEMENKES_BALITA_NUTRITION_URL =
  "https://ayosehat.kemkes.go.id/1000-hari-pertama-kehidupan/category/balita";
export const KEMENKES_LOCAL_FOOD_URL =
  "https://ayosehat.kemkes.go.id/pemberian-makanan-tambahan-pada-balita";

export type GrowthTrend =
  | "first_measurement"
  | "improving"
  | "stable"
  | "declining"
  | "unavailable";

export type LocalFoodGroup = {
  label: string;
  examples: string[];
};

export type LocalMeal = {
  slot: string;
  menu: string;
};

export type LocalizedNutritionPlan = {
  version: string;
  locale: "id-ID";
  ageBand: "24-35 bulan" | "36-59 bulan" | "24-59 bulan";
  title: string;
  focus: string[];
  foodGroups: LocalFoodGroup[];
  sampleDay: LocalMeal[];
  cautions: string[];
  sources: { label: string; url: string }[];
};

export type GrowthRecommendations = {
  version: string;
  basedOn: GrowthStatus;
  trend: GrowthTrend;
  currentHeightForAgeZ: number | null;
  previousHeightForAgeZ: number | null;
  trendDelta: number | null;
  risk: StuntingRiskAssessment;
  nutrition: string[];
  localizedNutrition: LocalizedNutritionPlan;
  nextSteps: string[];
};

export type GrowthRecommendationContext = {
  ageMonths?: number | null;
  currentHeightForAgeZ?: number | null;
  previousHeightForAgeZ?: number | null;
  currentAt?: number | null;
  previousAt?: number | null;
  riskHistory?: StuntingRiskPoint[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function trendFrom(
  current: number | null,
  previous: number | null,
): {
  trend: GrowthTrend;
  delta: number | null;
} {
  if (current === null) return { trend: "unavailable", delta: null };
  if (previous === null) return { trend: "first_measurement", delta: null };

  const delta = round2(current - previous);
  if (delta > 0.1) return { trend: "improving", delta };
  if (delta < -0.1) return { trend: "declining", delta };
  return { trend: "stable", delta };
}

function baseRecommendations(status: GrowthStatus) {
  switch (status) {
    case "severely_stunted":
      return {
        nutrition: [
          "Utamakan makanan beragam dan padat gizi dengan protein hewani yang mudah dijumpai, misalnya telur, ikan, ayam, atau daging sesuai toleransi anak.",
          "Lengkapi makanan utama dengan sumber karbohidrat, sayur, buah, serta lauk nabati seperti tempe atau tahu.",
          "Pertahankan jadwal makan teratur dan catat bila nafsu makan terus menurun untuk dibahas dengan tenaga kesehatan.",
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
        nutrition: [
          "Berikan makanan beragam dan padat gizi dengan sumber protein hewani secara rutin, misalnya telur, ikan, ayam, daging, atau susu/olahannya sesuai toleransi anak.",
          "Lengkapi menu keluarga dengan karbohidrat, sayur, buah, serta lauk nabati seperti tempe atau tahu.",
          "Batasi minuman manis dan makanan rendah gizi yang dapat menggantikan makanan utama.",
        ],
        nextSteps: [
          "Ulangi pengukuran tinggi dengan posisi yang benar untuk memastikan hasil.",
          "Bawa hasil ini ke Posyandu, Puskesmas, dokter, atau tenaga kesehatan untuk penilaian pertumbuhan dan penyebab yang mungkin mendasari.",
          "Pantau tinggi dan berat secara berkala serta diskusikan pola makan, riwayat penyakit, sanitasi, dan perkembangan anak dengan tenaga kesehatan.",
        ],
      };
    case "monitor":
      return {
        nutrition: [
          "Pertahankan pola makan beragam dengan protein hewani, lauk nabati, sayur, buah, karbohidrat, dan lemak sehat.",
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
        nutrition: [
          "Pertahankan pola makan beragam dan seimbang dengan protein hewani, lauk nabati, sayur, buah, dan sumber karbohidrat.",
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

function trendRecommendation(
  trend: GrowthTrend,
  delta: number | null,
): {
  nutrition: string[];
  nextSteps: string[];
} {
  const magnitude = delta === null ? null : Math.abs(delta).toFixed(2);

  switch (trend) {
    case "declining":
      return {
        nutrition: [
          "Karena tren TB/U tercatat menurun, catat pola makan harian dan bawa catatan tersebut saat berdiskusi dengan tenaga kesehatan agar kecukupan makan dapat ditinjau bersama.",
        ],
        nextSteps: [
          "TB/U turun " +
            magnitude +
            " SD dibanding pemeriksaan sebelumnya. Ulangi pengukuran dengan teknik yang benar dan bawa tren ini saat konsultasi atau pemantauan berikutnya.",
        ],
      };
    case "improving":
      return {
        nutrition: [
          "Pertahankan pola makan beragam dan kebiasaan makan yang sudah berjalan karena tren TB/U tercatat lebih tinggi dibanding pemeriksaan sebelumnya.",
        ],
        nextSteps: [
          "TB/U naik " +
            magnitude +
            " SD dibanding pemeriksaan sebelumnya. Lanjutkan pemantauan karena status WHO saat ini tetap menjadi dasar tindak lanjut.",
        ],
      };
    case "stable":
      return {
        nutrition: [
          "Pertahankan pola makan beragam dan teratur sambil terus memantau pertumbuhan dari waktu ke waktu.",
        ],
        nextSteps: [
          "TB/U relatif stabil dibanding pemeriksaan sebelumnya (perubahan " +
            magnitude +
            " SD). Lanjutkan pemantauan rutin.",
        ],
      };
    default:
      return { nutrition: [], nextSteps: [] };
  }
}

function localizedNutritionFor(
  status: GrowthStatus,
  trend: GrowthTrend,
  ageMonths: number | null,
): LocalizedNutritionPlan {
  const ageBand =
    ageMonths !== null && ageMonths >= 24 && ageMonths <= 35
      ? "24-35 bulan"
      : ageMonths !== null && ageMonths >= 36 && ageMonths <= 59
        ? "36-59 bulan"
        : "24-59 bulan";

  const focus = [
    "Gunakan bahan pangan yang mudah ditemukan di sekitar keluarga dan tetap jaga keragaman menu.",
    "Utamakan sumber protein hewani seperti telur, ikan, ayam, atau daging; kombinasikan dengan tempe/tahu, sayur, buah, dan makanan pokok.",
  ];

  if (status === "stunted" || status === "severely_stunted") {
    focus.unshift(
      "Karena TB/U berada di bawah batas WHO, rekomendasi makanan hanya bersifat pendamping dan perlu dibarengi evaluasi tenaga kesehatan.",
    );
  }
  if (trend === "declining") {
    focus.push(
      "Tren TB/U menurun: catat makanan yang benar-benar dimakan anak, bukan hanya yang disajikan, untuk dibawa saat konsultasi.",
    );
  }

  return {
    version: LOCAL_NUTRITION_VERSION,
    locale: "id-ID",
    ageBand,
    title: "Contoh menu pangan lokal Indonesia",
    focus,
    foodGroups: [
      {
        label: "Protein hewani",
        examples: ["telur", "ikan lele", "ikan kembung", "ayam", "daging"],
      },
      {
        label: "Protein nabati",
        examples: ["tempe", "tahu", "kacang hijau"],
      },
      {
        label: "Makanan pokok",
        examples: ["nasi", "ubi", "jagung", "kentang"],
      },
      {
        label: "Sayur",
        examples: ["bayam", "wortel", "labu siam", "buncis"],
      },
      {
        label: "Buah",
        examples: ["pisang", "pepaya", "jeruk"],
      },
    ],
    sampleDay: [
      { slot: "Pagi", menu: "Nasi + telur + sayur bayam + pepaya." },
      {
        slot: "Selingan pagi",
        menu: "Pisang matang atau ubi kukus dengan tekstur sesuai kemampuan makan anak.",
      },
      {
        slot: "Siang",
        menu: "Nasi + ikan lele/kembung + tempe + sayur bening.",
      },
      {
        slot: "Selingan sore",
        menu: "Buah potong lunak atau jagung/ubi yang diolah sederhana.",
      },
      {
        slot: "Malam",
        menu: "Nasi + ayam + tahu + wortel atau labu siam + buah.",
      },
    ],
    cautions: [
      "Ini contoh susunan menu, bukan resep medis atau hitungan porsi individual.",
      "Sesuaikan bahan dengan alergi, toleransi, kemampuan mengunyah/menelan, budaya keluarga, harga, dan ketersediaan pangan setempat.",
      "Untuk anak dengan masalah pertumbuhan, penyakit tertentu, atau sulit makan menetap, susun kebutuhan individual bersama tenaga kesehatan atau ahli gizi.",
    ],
    sources: [
      {
        label: "Kemenkes RI — Isi Piringku Balita 2-5 Tahun",
        url: KEMENKES_BALITA_NUTRITION_URL,
      },
      {
        label: "Kemenkes RI — PMT Berbahan Pangan Lokal bagi Balita",
        url: KEMENKES_LOCAL_FOOD_URL,
      },
    ],
  };
}

export function growthRecommendationsFor(
  status: GrowthStatus,
  context: GrowthRecommendationContext = {},
): GrowthRecommendations {
  const ageMonths = context.ageMonths ?? null;
  const currentHeightForAgeZ = context.currentHeightForAgeZ ?? null;
  const previousHeightForAgeZ = context.previousHeightForAgeZ ?? null;
  const { trend, delta } = trendFrom(
    currentHeightForAgeZ,
    previousHeightForAgeZ,
  );
  const base = baseRecommendations(status);
  const contextual = trendRecommendation(trend, delta);
  const risk = stuntingRiskFor({
    growthStatus: status,
    currentHeightForAgeZ,
    currentAt: context.currentAt ?? null,
    history: context.riskHistory ?? [],
  });

  return {
    version: GROWTH_RECOMMENDATION_VERSION,
    basedOn: status,
    trend,
    currentHeightForAgeZ,
    previousHeightForAgeZ,
    trendDelta: delta,
    risk,
    nutrition: [...base.nutrition, ...contextual.nutrition],
    localizedNutrition: localizedNutritionFor(status, trend, ageMonths),
    nextSteps: [...contextual.nextSteps, ...base.nextSteps],
  };
}
