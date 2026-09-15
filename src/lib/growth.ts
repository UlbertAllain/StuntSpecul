export type Sex = "male" | "female";

export type GrowthStatus =
  | "unavailable"
  | "within_range"
  | "monitor"
  | "stunted"
  | "severely_stunted";

export type StuntingScreening =
  | "not_indicated"
  | "monitor"
  | "indicated"
  | "severe"
  | null;

export type GrowthAssessment = {
  heightForAgeZ: number | null;
  growthStatus: GrowthStatus;
  stuntingScreening: StuntingScreening;
  measurementValid: boolean;
};

// WHO Child Growth Standards, height-for-age 2–5 years.
// For this indicator L=1, therefore z = (height - M) / (M * S).
// Source: https://www.who.int/tools/child-growth-standards/standards/length-height-for-age
const GIRLS_M = [
  85.7153, 86.5904, 87.4462, 88.283, 89.1004, 89.8991, 90.6797, 91.443,
  92.1906, 92.9239, 93.6444, 94.3533, 95.0515, 95.7399, 96.4187, 97.0885,
  97.7493, 98.4015, 99.0448, 99.6795, 100.3058, 100.9238, 101.5337,
  102.136, 102.7312, 103.3197, 103.9021, 104.4786, 105.0494, 105.6148,
  106.1748, 106.7295, 107.2788, 107.8227, 108.3613, 108.8948, 109.4233,
] as const;

const GIRLS_S = [
  0.03764, 0.03786, 0.03808, 0.0383, 0.03851, 0.03872, 0.03893, 0.03913,
  0.03933, 0.03952, 0.03971, 0.03989, 0.04006, 0.04024, 0.04041, 0.04057,
  0.04073, 0.04089, 0.04105, 0.0412, 0.04135, 0.0415, 0.04164, 0.04179,
  0.04193, 0.04206, 0.0422, 0.04233, 0.04246, 0.04259, 0.04272, 0.04285,
  0.04298, 0.0431, 0.04322, 0.04334, 0.04347,
] as const;

const BOYS_M = [
  87.1161, 87.972, 88.8065, 89.6197, 90.412, 91.1828, 91.9327, 92.6631,
  93.3753, 94.0711, 94.7532, 95.4236, 96.0835, 96.7337, 97.3749, 98.0073,
  98.631, 99.2459, 99.8515, 100.4485, 101.0374, 101.6186, 102.1933,
  102.7625, 103.3273, 103.8886, 104.4473, 105.0041, 105.5596, 106.1138,
  106.6668, 107.2188, 107.7697, 108.3198, 108.8689, 109.417, 109.9638,
] as const;

const BOYS_S = [
  0.03507, 0.03542, 0.03576, 0.0361, 0.03642, 0.03674, 0.03704, 0.03733,
  0.03761, 0.03787, 0.03812, 0.03836, 0.03858, 0.03879, 0.039, 0.03919,
  0.03937, 0.03954, 0.03971, 0.03986, 0.04002, 0.04016, 0.04031, 0.04045,
  0.04059, 0.04073, 0.04086, 0.041, 0.04113, 0.04126, 0.04139, 0.04152,
  0.04165, 0.04177, 0.0419, 0.04202, 0.04214,
] as const;

const MIN_AGE_MONTHS = 24;
const MAX_AGE_MONTHS = 59;

export function assessHeightForAge(
  ageMonths: number,
  sex: Sex,
  heightCm: number | null,
): GrowthAssessment {
  if (
    heightCm === null ||
    !Number.isFinite(heightCm) ||
    ageMonths < MIN_AGE_MONTHS ||
    ageMonths > MAX_AGE_MONTHS ||
    !Number.isInteger(ageMonths)
  ) {
    return {
      heightForAgeZ: null,
      growthStatus: "unavailable",
      stuntingScreening: null,
      measurementValid: heightCm === null,
    };
  }

  const index = ageMonths - MIN_AGE_MONTHS;
  const median = sex === "male" ? BOYS_M[index] : GIRLS_M[index];
  const s = sex === "male" ? BOYS_S[index] : GIRLS_S[index];
  if (median === undefined || s === undefined) {
    return {
      heightForAgeZ: null,
      growthStatus: "unavailable",
      stuntingScreening: null,
      measurementValid: false,
    };
  }

  const z = (heightCm - median) / (median * s);
  // WHO flags height-for-age values below -6 or above +6 SD as biologically implausible.
  if (!Number.isFinite(z) || z < -6 || z > 6) {
    return {
      heightForAgeZ: null,
      growthStatus: "unavailable",
      stuntingScreening: null,
      measurementValid: false,
    };
  }

  const rounded = Math.round(z * 100) / 100;
  if (z < -3)
    return {
      heightForAgeZ: rounded,
      growthStatus: "severely_stunted",
      stuntingScreening: "severe",
      measurementValid: true,
    };
  if (z < -2)
    return {
      heightForAgeZ: rounded,
      growthStatus: "stunted",
      stuntingScreening: "indicated",
      measurementValid: true,
    };
  if (z < -1)
    return {
      heightForAgeZ: rounded,
      growthStatus: "monitor",
      stuntingScreening: "monitor",
      measurementValid: true,
    };
  return {
    heightForAgeZ: rounded,
    growthStatus: "within_range",
    stuntingScreening: "not_indicated",
    measurementValid: true,
  };
}

export function growthStatusLabel(status: GrowthStatus): string {
  switch (status) {
    case "within_range":
      return "Tinggi menurut umur dalam rentang pemantauan";
    case "monitor":
      return "Perlu pemantauan pertumbuhan";
    case "stunted":
      return "Indikasi stunting";
    case "severely_stunted":
      return "Indikasi stunting berat";
    default:
      return "Belum tersedia";
  }
}

export function stuntingScreeningLabel(status: StuntingScreening): string {
  switch (status) {
    case "not_indicated":
      return "Tidak terindikasi dari TB/U";
    case "monitor":
      return "Belum stunting, perlu dipantau";
    case "indicated":
      return "Terindikasi stunting";
    case "severe":
      return "Terindikasi stunting berat";
    default:
      return "Belum tersedia";
  }
}

export function followUpForGrowthStatus(status: GrowthStatus): string[] {
  switch (status) {
    case "severely_stunted":
    case "stunted":
      return [
        "Ulangi pengukuran tinggi dengan posisi yang benar untuk memastikan hasil.",
        "Bawa hasil ini ke Posyandu, Puskesmas, dokter, atau tenaga kesehatan untuk penilaian lanjutan.",
        "Diskusikan riwayat pertumbuhan, pola makan, dan kondisi kesehatan anak dengan tenaga kesehatan.",
      ];
    case "monitor":
      return [
        "Pantau tinggi badan secara berkala dan bandingkan tren pertumbuhannya.",
        "Konsultasikan ke tenaga kesehatan bila pertumbuhan melambat atau ada keluhan lain.",
        "Pertahankan pola makan beragam dan pemantauan tumbuh kembang rutin.",
      ];
    case "within_range":
      return [
        "Lanjutkan pemantauan pertumbuhan secara rutin.",
        "Pertahankan pola makan beragam sesuai usia dan kebiasaan hidup sehat.",
        "Simpan hasil untuk dibandingkan dengan pemeriksaan berikutnya.",
      ];
    default:
      return [
        "Hasil TB/U belum dapat dihitung. Pastikan pengukuran tinggi badan tersedia dan valid.",
      ];
  }
}
