import {
  linearGrowthIndicator,
  type GrowthStatus,
} from "./growth.ts";
import {
  stuntingRiskFor,
  type StuntingRiskAssessment,
  type StuntingRiskPoint,
} from "./stunting-risk.ts";

export const GROWTH_RECOMMENDATION_VERSION = "growth-rec-v4";
export const LOCAL_NUTRITION_VERSION = "nutrition-id-v2";
export const KEMENKES_BALITA_NUTRITION_URL =
  "https://ayosehat.kemkes.go.id/1000-hari-pertama-kehidupan/category/balita";
export const KEMENKES_MPASI_URL =
  "https://ayosehat.kemkes.go.id/petunjuk-teknis-pemantauan-praktik-mp-asi-anak-usia-6-23-bulan";
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
  ageBand:
    | "0-5 bulan"
    | "6-8 bulan"
    | "9-11 bulan"
    | "12-23 bulan"
    | "24-35 bulan"
    | "36-59 bulan"
    | "0-59 bulan";
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

function nutritionForAge(ageMonths: number | null) {
  if (ageMonths !== null && ageMonths < 6) {
    return [
      "Untuk bayi usia 0–5 bulan, fokus pemberian makan adalah ASI sesuai anjuran Kemenkes dan arahan tenaga kesehatan; aplikasi tidak membuat menu MP-ASI untuk usia ini.",
      "Bila ada kesulitan menyusu, kenaikan berat tidak sesuai, atau kondisi kesehatan tertentu, konsultasikan ke tenaga kesehatan.",
    ];
  }

  if (ageMonths !== null && ageMonths < 24) {
    return [
      "Mulai usia 6 bulan, lanjutkan ASI dan berikan MP-ASI sesuai tahap usia, tekstur, kemampuan makan, dan anjuran Kemenkes.",
      "Utamakan makanan beragam dengan sumber protein hewani seperti telur, ikan, ayam, atau daging; kombinasikan dengan makanan pokok, sayur, buah, serta tempe atau tahu.",
      "Naikkan tekstur makanan bertahap sesuai usia dan kemampuan mengunyah/menelan anak.",
    ];
  }

  return [
    "Pertahankan pola makan beragam dan seimbang dengan protein hewani, lauk nabati, sayur, buah, dan sumber karbohidrat.",
    "Utamakan air putih dan batasi minuman manis serta makanan rendah gizi yang menggantikan makanan utama.",
    "Pertahankan jadwal makan teratur dan kebiasaan makan responsif tanpa memaksa anak.",
  ];
}

function baseRecommendations(
  status: GrowthStatus,
  ageMonths: number | null,
) {
  const indicator = linearGrowthIndicator(ageMonths ?? 24);
  const measureName = indicator === "PB/U" ? "panjang badan" : "tinggi badan";
  const nutrition = nutritionForAge(ageMonths);

  switch (status) {
    case "severely_stunted":
      return {
        nutrition,
        nextSteps: [
          `Ulangi pengukuran ${measureName} dengan teknik yang benar untuk memastikan hasil.`,
          "Jadwalkan penilaian di Posyandu, Puskesmas, dokter, atau tenaga kesehatan untuk konfirmasi pertumbuhan dan mencari faktor penyebab.",
          "Bawa riwayat hasil sebelumnya dan diskusikan pola makan, penyakit berulang, perkembangan, serta kondisi lingkungan anak.",
          "Jika anak tampak sangat lemas, sulit makan atau minum, atau sedang sakit berat, cari pertolongan medis segera.",
        ],
      };
    case "stunted":
      return {
        nutrition,
        nextSteps: [
          `Ulangi pengukuran ${measureName} dengan teknik yang benar untuk memastikan hasil.`,
          "Bawa hasil ini ke Posyandu, Puskesmas, dokter, atau tenaga kesehatan untuk penilaian pertumbuhan dan faktor yang mungkin mendasari.",
          `Pantau ${measureName} dan berat badan secara berkala serta diskusikan pola makan, riwayat penyakit, sanitasi, dan perkembangan anak dengan tenaga kesehatan.`,
        ],
      };
    case "monitor":
      return {
        nutrition,
        nextSteps: [
          `Pantau ${measureName} dan berat badan secara berkala dan bandingkan tren antar pemeriksaan.`,
          "Konsultasikan ke tenaga kesehatan bila pertumbuhan melambat atau ada keluhan lain.",
        ],
      };
    case "within_range":
      return {
        nutrition,
        nextSteps: [
          "Lanjutkan pemantauan pertumbuhan secara rutin di Posyandu atau fasilitas kesehatan.",
          "Simpan hasil ini untuk dibandingkan dengan pemeriksaan berikutnya.",
          "Konsultasikan bila muncul perubahan pola makan, penyakit berulang, atau pertumbuhan tampak melambat.",
        ],
      };
    default:
      return {
        nutrition,
        nextSteps: [
          `Ulangi pengukuran ${measureName} karena ${indicator} belum dapat dihitung.`,
          "Konsultasikan ke petugas kesehatan bila pengukuran berulang tetap tidak sesuai atau ada keluhan pertumbuhan.",
        ],
      };
  }
}

function trendRecommendation(
  trend: GrowthTrend,
  delta: number | null,
  indicator: "PB/U" | "TB/U",
): {
  nutrition: string[];
  nextSteps: string[];
} {
  const magnitude = delta === null ? null : Math.abs(delta).toFixed(2);

  switch (trend) {
    case "declining":
      return {
        nutrition: [
          `Karena tren ${indicator} menurun, catat pola makan yang benar-benar dikonsumsi anak dan bawa catatan tersebut saat berdiskusi dengan tenaga kesehatan.`,
        ],
        nextSteps: [
          `${indicator} turun ${magnitude} SD dibanding pemeriksaan sebelumnya. Ulangi pengukuran dengan teknik yang benar dan bawa tren ini saat konsultasi atau pemantauan berikutnya.`,
        ],
      };
    case "improving":
      return {
        nutrition: [
          `Pertahankan pola makan sesuai usia karena tren ${indicator} tercatat lebih tinggi dibanding pemeriksaan sebelumnya.`,
        ],
        nextSteps: [
          `${indicator} naik ${magnitude} SD dibanding pemeriksaan sebelumnya. Lanjutkan pemantauan karena status pertumbuhan saat ini tetap menjadi dasar tindak lanjut.`,
        ],
      };
    case "stable":
      return {
        nutrition: [
          "Pertahankan pola makan sesuai usia sambil terus memantau pertumbuhan dari waktu ke waktu.",
        ],
        nextSteps: [
          `${indicator} relatif stabil dibanding pemeriksaan sebelumnya (perubahan ${magnitude} SD). Lanjutkan pemantauan rutin.`,
        ],
      };
    default:
      return { nutrition: [], nextSteps: [] };
  }
}

function ageBandFor(ageMonths: number | null): LocalizedNutritionPlan["ageBand"] {
  if (ageMonths === null || ageMonths < 0 || ageMonths > 59) return "0-59 bulan";
  if (ageMonths <= 5) return "0-5 bulan";
  if (ageMonths <= 8) return "6-8 bulan";
  if (ageMonths <= 11) return "9-11 bulan";
  if (ageMonths <= 23) return "12-23 bulan";
  if (ageMonths <= 35) return "24-35 bulan";
  return "36-59 bulan";
}

function localizedNutritionFor(
  status: GrowthStatus,
  trend: GrowthTrend,
  ageMonths: number | null,
): LocalizedNutritionPlan {
  const ageBand = ageBandFor(ageMonths);
  const indicator = linearGrowthIndicator(ageMonths ?? 24);
  const commonCautions = [
    "Rekomendasi ini bersifat edukatif, bukan resep medis atau hitungan porsi individual.",
    "Sesuaikan dengan alergi, toleransi, kemampuan mengunyah/menelan, budaya keluarga, harga, dan ketersediaan pangan setempat.",
    "Jika anak memiliki masalah pertumbuhan, penyakit tertentu, atau sulit makan menetap, susun kebutuhan individual bersama tenaga kesehatan atau ahli gizi.",
  ];

  if (ageBand === "0-5 bulan") {
    return {
      version: LOCAL_NUTRITION_VERSION,
      locale: "id-ID",
      ageBand,
      title: "Panduan pemberian makan usia 0–5 bulan",
      focus: [
        "Aplikasi tidak membuat menu makanan padat untuk bayi 0–5 bulan.",
        "Fokus pada ASI sesuai anjuran Kemenkes dan evaluasi tenaga kesehatan bila terdapat kendala menyusu atau pertumbuhan.",
      ],
      foodGroups: [],
      sampleDay: [],
      cautions: commonCautions,
      sources: [
        {
          label: "Kemenkes RI — 1000 Hari Pertama Kehidupan / Balita",
          url: KEMENKES_BALITA_NUTRITION_URL,
        },
      ],
    };
  }

  const focus = [
    "Gunakan bahan pangan yang mudah ditemukan di sekitar keluarga dan tetap jaga keragaman menu.",
    "Utamakan protein hewani seperti telur, ikan, ayam, atau daging; kombinasikan dengan tempe/tahu, sayur, buah, dan makanan pokok.",
  ];

  if (status === "stunted" || status === "severely_stunted") {
    focus.unshift(
      `Karena ${indicator} berada di bawah -2 SD, rekomendasi makanan hanya bersifat pendamping dan perlu dibarengi evaluasi tenaga kesehatan.`,
    );
  }
  if (trend === "declining") {
    focus.push(
      `Tren ${indicator} menurun: catat makanan yang benar-benar dimakan anak, bukan hanya yang disajikan, untuk dibawa saat konsultasi.`,
    );
  }

  if (ageMonths !== null && ageMonths < 24) {
    const sampleDay: LocalMeal[] =
      ageBand === "6-8 bulan"
        ? [
            {
              slot: "Makan utama",
              menu: "Bubur kental dari makanan pokok + telur/ikan/ayam + sayur, dengan tekstur lumat sesuai kemampuan anak.",
            },
            {
              slot: "Selingan",
              menu: "Buah lumat seperti pisang atau pepaya sesuai toleransi.",
            },
          ]
        : ageBand === "9-11 bulan"
          ? [
              {
                slot: "Pagi",
                menu: "Nasi tim/lembek + telur + sayur dengan tekstur cincang halus.",
              },
              {
                slot: "Siang",
                menu: "Nasi tim + ikan lele/kembung + tempe + sayur.",
              },
              {
                slot: "Selingan",
                menu: "Pisang, pepaya, ubi, atau bahan lokal lain dengan tekstur aman.",
              },
            ]
          : [
              {
                slot: "Pagi",
                menu: "Makanan keluarga yang disesuaikan teksturnya: nasi + telur + sayur + buah.",
              },
              {
                slot: "Siang",
                menu: "Nasi + ikan lele/kembung + tempe + sayur.",
              },
              {
                slot: "Selingan",
                menu: "Buah, ubi, jagung, atau pangan lokal lain yang sesuai kemampuan makan anak.",
              },
              {
                slot: "Malam",
                menu: "Nasi + ayam + tahu + sayur + buah.",
              },
            ];

    return {
      version: LOCAL_NUTRITION_VERSION,
      locale: "id-ID",
      ageBand,
      title: "Contoh MP-ASI berbahan pangan lokal",
      focus: [
        "Lanjutkan ASI dan berikan MP-ASI sesuai tahap usia serta kemampuan makan anak.",
        ...focus,
      ],
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
          label: "Sayur dan buah",
          examples: ["bayam", "wortel", "labu", "pisang", "pepaya"],
        },
      ],
      sampleDay,
      cautions: commonCautions,
      sources: [
        {
          label: "Kemenkes RI — Juknis MP-ASI Anak Usia 6–23 Bulan",
          url: KEMENKES_MPASI_URL,
        },
        {
          label: "Kemenkes RI — PMT Berbahan Pangan Lokal",
          url: KEMENKES_LOCAL_FOOD_URL,
        },
      ],
    };
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
    cautions: commonCautions,
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
  const indicator = linearGrowthIndicator(ageMonths ?? 24);
  const currentHeightForAgeZ = context.currentHeightForAgeZ ?? null;
  const previousHeightForAgeZ = context.previousHeightForAgeZ ?? null;
  const { trend, delta } = trendFrom(
    currentHeightForAgeZ,
    previousHeightForAgeZ,
  );
  const base = baseRecommendations(status, ageMonths);
  const contextual = trendRecommendation(trend, delta, indicator);
  const risk = stuntingRiskFor({
    growthStatus: status,
    currentHeightForAgeZ,
    indicator,
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
