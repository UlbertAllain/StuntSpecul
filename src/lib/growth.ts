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
  85.7153, 86.5904, 87.4462, 88.283, 89.1004, 89.8991, 90.6797, 91.443, 92.1906,
  92.9239, 93.6444, 94.3533, 95.0515, 95.7399, 96.4187, 97.0885, 97.7493,
  98.4015, 99.0448, 99.6795, 100.3058, 100.9238, 101.5337, 102.136, 102.7312,
  103.3197, 103.9021, 104.4786, 105.0494, 105.6148, 106.1748, 106.7295,
  107.2788, 107.8227, 108.3613, 108.8948, 109.4233,
] as const;

const GIRLS_S = [
  0.03764, 0.03786, 0.03808, 0.0383, 0.03851, 0.03872, 0.03893, 0.03913,
  0.03933, 0.03952, 0.03971, 0.03989, 0.04006, 0.04024, 0.04041, 0.04057,
  0.04073, 0.04089, 0.04105, 0.0412, 0.04135, 0.0415, 0.04164, 0.04179, 0.04193,
  0.04206, 0.0422, 0.04233, 0.04246, 0.04259, 0.04272, 0.04285, 0.04298, 0.0431,
  0.04322, 0.04334, 0.04347,
] as const;

const BOYS_M = [
  87.1161, 87.972, 88.8065, 89.6197, 90.412, 91.1828, 91.9327, 92.6631, 93.3753,
  94.0711, 94.7532, 95.4236, 96.0835, 96.7337, 97.3749, 98.0073, 98.631,
  99.2459, 99.8515, 100.4485, 101.0374, 101.6186, 102.1933, 102.7625, 103.3273,
  103.8886, 104.4473, 105.0041, 105.5596, 106.1138, 106.6668, 107.2188,
  107.7697, 108.3198, 108.8689, 109.417, 109.9638,
] as const;

const BOYS_S = [
  0.03507, 0.03542, 0.03576, 0.0361, 0.03642, 0.03674, 0.03704, 0.03733,
  0.03761, 0.03787, 0.03812, 0.03836, 0.03858, 0.03879, 0.039, 0.03919, 0.03937,
  0.03954, 0.03971, 0.03986, 0.04002, 0.04016, 0.04031, 0.04045, 0.04059,
  0.04073, 0.04086, 0.041, 0.04113, 0.04126, 0.04139, 0.04152, 0.04165, 0.04177,
  0.0419, 0.04202, 0.04214,
] as const;

// WHO Child Growth Standards, length-for-age birth to 23 months.
// L=1 for this indicator. Source:
// https://www.who.int/toolkits/child-growth-standards/standards/length-height-for-age
const INFANT_GIRLS_M = [
  49.1477, 53.6872, 57.0673, 59.8029, 62.0899, 64.0301, 65.7311, 67.2873,
  68.7498, 70.1435, 71.4818, 72.771, 74.015, 75.2176, 76.3817, 77.5099, 78.6055,
  79.671, 80.7079, 81.7182, 82.7036, 83.6654, 84.604, 85.5202,
] as const;

const INFANT_GIRLS_S = [
  0.0379, 0.0364, 0.03568, 0.0352, 0.03486, 0.03463, 0.03448, 0.03441, 0.0344,
  0.03444, 0.03452, 0.03464, 0.03479, 0.03496, 0.03514, 0.03534, 0.03555,
  0.03576, 0.03598, 0.0362, 0.03643, 0.03666, 0.03688, 0.03711,
] as const;

const INFANT_BOYS_M = [
  49.8842, 54.7244, 58.4249, 61.4292, 63.886, 65.9026, 67.6236, 69.1645,
  70.5994, 71.9687, 73.2812, 74.5388, 75.7488, 76.9186, 78.0497, 79.1458,
  80.2113, 81.2487, 82.2587, 83.2418, 84.1996, 85.1348, 86.0477, 86.941,
] as const;

const INFANT_BOYS_S = [
  0.03795, 0.03557, 0.03424, 0.03328, 0.03257, 0.03204, 0.03165, 0.03139,
  0.03124, 0.03117, 0.03118, 0.03125, 0.03137, 0.03154, 0.03174, 0.03197,
  0.03222, 0.0325, 0.03279, 0.0331, 0.03342, 0.03376, 0.0341, 0.03445,
] as const;

const INFANT_MIN_AGE_MONTHS = 0;
const INFANT_MAX_AGE_MONTHS = 23;

const MIN_AGE_MONTHS = 24;
const MAX_AGE_MONTHS = 59;

export function heightForAgeAtZScore(
  ageMonths: number,
  sex: Sex,
  zScore: number,
): number | null {
  if (
    !Number.isInteger(ageMonths) ||
    ageMonths < MIN_AGE_MONTHS ||
    ageMonths > MAX_AGE_MONTHS ||
    !Number.isFinite(zScore)
  ) {
    return null;
  }

  const index = ageMonths - MIN_AGE_MONTHS;
  const median = sex === "male" ? BOYS_M[index] : GIRLS_M[index];
  const s = sex === "male" ? BOYS_S[index] : GIRLS_S[index];

  if (median === undefined || s === undefined) return null;

  return Math.round(median * (1 + s * zScore) * 10) / 10;
}

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
  return {
    heightForAgeZ: rounded,
    growthStatus: "within_range",
    stuntingScreening: "not_indicated",
    measurementValid: true,
  };
}

export function assessLengthForAge(
  ageMonths: number,
  sex: Sex,
  lengthCm: number | null,
): GrowthAssessment {
  if (
    lengthCm === null ||
    !Number.isFinite(lengthCm) ||
    !Number.isInteger(ageMonths) ||
    ageMonths < INFANT_MIN_AGE_MONTHS ||
    ageMonths > INFANT_MAX_AGE_MONTHS
  ) {
    return {
      heightForAgeZ: null,
      growthStatus: "unavailable",
      stuntingScreening: null,
      measurementValid: lengthCm === null,
    };
  }

  const median =
    sex === "male" ? INFANT_BOYS_M[ageMonths] : INFANT_GIRLS_M[ageMonths];
  const sValue =
    sex === "male" ? INFANT_BOYS_S[ageMonths] : INFANT_GIRLS_S[ageMonths];
  if (median === undefined || sValue === undefined) {
    return {
      heightForAgeZ: null,
      growthStatus: "unavailable",
      stuntingScreening: null,
      measurementValid: false,
    };
  }

  const z = (lengthCm - median) / (median * sValue);
  if (!Number.isFinite(z) || z < -6 || z > 6) {
    return {
      heightForAgeZ: null,
      growthStatus: "unavailable",
      stuntingScreening: null,
      measurementValid: false,
    };
  }

  const rounded = Math.round(z * 100) / 100;
  if (z < -3) {
    return {
      heightForAgeZ: rounded,
      growthStatus: "severely_stunted",
      stuntingScreening: "severe",
      measurementValid: true,
    };
  }
  if (z < -2) {
    return {
      heightForAgeZ: rounded,
      growthStatus: "stunted",
      stuntingScreening: "indicated",
      measurementValid: true,
    };
  }
  return {
    heightForAgeZ: rounded,
    growthStatus: "within_range",
    stuntingScreening: "not_indicated",
    measurementValid: true,
  };
}

export function assessLinearGrowthForAge(
  ageMonths: number,
  sex: Sex,
  lengthOrHeightCm: number | null,
): GrowthAssessment {
  return ageMonths <= INFANT_MAX_AGE_MONTHS
    ? assessLengthForAge(ageMonths, sex, lengthOrHeightCm)
    : assessHeightForAge(ageMonths, sex, lengthOrHeightCm);
}

export function linearGrowthIndicator(ageMonths: number): "PB/U" | "TB/U" {
  return ageMonths <= INFANT_MAX_AGE_MONTHS ? "PB/U" : "TB/U";
}

export function growthStatusLabel(status: GrowthStatus): string {
  switch (status) {
    case "within_range":
      return "Tidak terindikasi stunting (TB/U ≥ -2 SD)";
    case "monitor":
      return "Tidak terindikasi stunting; pantau tren TB/U";
    case "stunted":
      return "Terindikasi stunting (TB/U < -2 SD)";
    case "severely_stunted":
      return "Terindikasi stunting berat (TB/U < -3 SD)";
    default:
      return "Belum tersedia";
  }
}

export function stuntingScreeningLabel(status: StuntingScreening): string {
  switch (status) {
    case "not_indicated":
      return "Tidak terindikasi stunting (TB/U ≥ -2 SD)";
    case "monitor":
      return "Tidak terindikasi stunting; pantau tren TB/U";
    case "indicated":
      return "Terindikasi stunting (TB/U < -2 SD)";
    case "severe":
      return "Terindikasi stunting berat (TB/U < -3 SD)";
    default:
      return "Belum tersedia";
  }
}

export function growthStatusLabelForAge(
  status: GrowthStatus,
  ageMonths: number,
): string {
  const indicator = linearGrowthIndicator(ageMonths);
  switch (status) {
    case "within_range":
      return `Tidak terindikasi stunting (${indicator} ≥ -2 SD)`;
    case "monitor":
      return `Tidak terindikasi stunting; pantau tren ${indicator}`;
    case "stunted":
      return `Terindikasi stunting (${indicator} < -2 SD)`;
    case "severely_stunted":
      return `Terindikasi stunting berat (${indicator} < -3 SD)`;
    default:
      return "Belum tersedia";
  }
}

export function stuntingScreeningLabelForAge(
  status: StuntingScreening,
  ageMonths: number,
): string {
  const indicator = linearGrowthIndicator(ageMonths);
  switch (status) {
    case "not_indicated":
      return `Tidak terindikasi stunting (${indicator} ≥ -2 SD)`;
    case "monitor":
      return `Tidak terindikasi stunting; pantau tren ${indicator}`;
    case "indicated":
      return `Terindikasi stunting (${indicator} < -2 SD)`;
    case "severe":
      return `Terindikasi stunting berat (${indicator} < -3 SD)`;
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
