import {
  assessHeightForAge,
  type GrowthStatus,
  type Sex,
  type StuntingScreening,
} from "./growth";

export type MeasurementQuality = "valid" | "incomplete" | "recheck";

export type AnthropometryAssessment = {
  measurementQuality: MeasurementQuality;
  measurementReason: string | null;
  heightForAgeZ: number | null;
  weightForAgeZ: number | null;
  growthStatus: GrowthStatus;
  stuntingScreening: StuntingScreening;
};

const MIN_AGE_MONTHS = 24;
const MAX_AGE_MONTHS = 59;

// WHO Child Growth Standards weight-for-age LMS parameters, 24–59 months.
const GIRLS_WFA_LMS = [
  [-0.2941, 11.4775, 0.1239],
  [-0.2975, 11.6864, 0.12414],
  [-0.3005, 11.8947, 0.12441],
  [-0.3032, 12.1015, 0.12472],
  [-0.3057, 12.3059, 0.12506],
  [-0.308, 12.5073, 0.12545],
  [-0.3101, 12.7055, 0.12587],
  [-0.312, 12.9006, 0.12633],
  [-0.3138, 13.093, 0.12683],
  [-0.3155, 13.2837, 0.12737],
  [-0.3171, 13.4731, 0.12794],
  [-0.3186, 13.6618, 0.12855],
  [-0.3201, 13.8503, 0.12919],
  [-0.3216, 14.0385, 0.12988],
  [-0.323, 14.2265, 0.13059],
  [-0.3243, 14.414, 0.13135],
  [-0.3257, 14.601, 0.13213],
  [-0.327, 14.7873, 0.13293],
  [-0.3283, 14.9727, 0.13376],
  [-0.3296, 15.1573, 0.1346],
  [-0.3309, 15.341, 0.13545],
  [-0.3322, 15.524, 0.1363],
  [-0.3335, 15.7064, 0.13716],
  [-0.3348, 15.8882, 0.138],
  [-0.3361, 16.0697, 0.13884],
  [-0.3374, 16.2511, 0.13968],
  [-0.3387, 16.4322, 0.14051],
  [-0.34, 16.6133, 0.14132],
  [-0.3414, 16.7942, 0.14213],
  [-0.3427, 16.9748, 0.14293],
  [-0.344, 17.1551, 0.14371],
  [-0.3453, 17.3347, 0.14448],
  [-0.3466, 17.5136, 0.14525],
  [-0.3479, 17.6916, 0.146],
  [-0.3492, 17.8686, 0.14675],
  [-0.3505, 18.0445, 0.14748],
] as const;

const BOYS_WFA_LMS = [
  [-0.0137, 12.1515, 0.11426],
  [-0.0189, 12.3502, 0.11485],
  [-0.024, 12.5466, 0.11544],
  [-0.0289, 12.7401, 0.11604],
  [-0.0337, 12.9303, 0.11664],
  [-0.0385, 13.1169, 0.11723],
  [-0.0431, 13.3, 0.11781],
  [-0.0476, 13.4798, 0.11839],
  [-0.052, 13.6567, 0.11896],
  [-0.0564, 13.8309, 0.11953],
  [-0.0606, 14.0031, 0.12008],
  [-0.0648, 14.1736, 0.12062],
  [-0.0689, 14.3429, 0.12116],
  [-0.0729, 14.5113, 0.12168],
  [-0.0769, 14.6791, 0.1222],
  [-0.0808, 14.8466, 0.12271],
  [-0.0846, 15.014, 0.12322],
  [-0.0883, 15.1813, 0.12373],
  [-0.092, 15.3486, 0.12425],
  [-0.0957, 15.5158, 0.12478],
  [-0.0993, 15.6828, 0.12531],
  [-0.1028, 15.8497, 0.12586],
  [-0.1063, 16.0163, 0.12643],
  [-0.1097, 16.1827, 0.127],
  [-0.1131, 16.3489, 0.12759],
  [-0.1165, 16.515, 0.12819],
  [-0.1198, 16.6811, 0.1288],
  [-0.123, 16.8471, 0.12943],
  [-0.1262, 17.0132, 0.13005],
  [-0.1294, 17.1792, 0.13069],
  [-0.1325, 17.3452, 0.13133],
  [-0.1356, 17.5111, 0.13197],
  [-0.1387, 17.6768, 0.13261],
  [-0.1417, 17.8422, 0.13325],
  [-0.1447, 18.0073, 0.13389],
  [-0.1477, 18.1722, 0.13453],
] as const;

function lmsValueAtZ(l: number, m: number, s: number, z: number) {
  if (l === 0) return m * Math.exp(s * z);
  return m * (1 + l * s * z) ** (1 / l);
}

export function weightForAgeZScore(
  ageMonths: number,
  sex: Sex,
  weightKg: number | null,
): number | null {
  if (
    weightKg === null ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    !Number.isInteger(ageMonths) ||
    ageMonths < MIN_AGE_MONTHS ||
    ageMonths > MAX_AGE_MONTHS
  ) {
    return null;
  }

  const row =
    (sex === "male" ? BOYS_WFA_LMS : GIRLS_WFA_LMS)[
      ageMonths - MIN_AGE_MONTHS
    ];
  if (!row) return null;

  const l = Number(row[0]);
  const m = Number(row[1]);
  const s = Number(row[2]);
  const raw =
    l === 0
      ? Math.log(weightKg / m) / s
      : ((weightKg / m) ** l - 1) / (s * l);

  let z = raw;
  if (raw > 3) {
    const sd3 = lmsValueAtZ(l, m, s, 3);
    const sd2 = lmsValueAtZ(l, m, s, 2);
    z = 3 + (weightKg - sd3) / (sd3 - sd2);
  } else if (raw < -3) {
    const sdMinus3 = lmsValueAtZ(l, m, s, -3);
    const sdMinus2 = lmsValueAtZ(l, m, s, -2);
    z = -3 + (weightKg - sdMinus3) / (sdMinus2 - sdMinus3);
  }

  return Math.round(z * 100) / 100;
}

export function assessAnthropometry(
  ageMonths: number,
  sex: Sex,
  heightCm: number | null,
  weightKg: number | null,
): AnthropometryAssessment {
  const height = assessHeightForAge(ageMonths, sex, heightCm);
  const weightForAgeZ = weightForAgeZScore(ageMonths, sex, weightKg);

  const heightNeedsRecheck =
    heightCm !== null && height.measurementValid === false;
  const weightNeedsRecheck =
    weightKg !== null &&
    (weightForAgeZ === null || weightForAgeZ < -6 || weightForAgeZ > 5);

  if (heightNeedsRecheck || weightNeedsRecheck) {
    const reasons = [
      heightNeedsRecheck
        ? "Tinggi badan berada di luar rentang valid WHO."
        : null,
      weightNeedsRecheck
        ? "Berat badan berada di luar rentang valid WHO untuk usia."
        : null,
    ].filter(Boolean);

    return {
      measurementQuality: "recheck",
      measurementReason: `${reasons.join(" ")} Silakan ulangi pengukuran.`,
      heightForAgeZ: null,
      weightForAgeZ,
      growthStatus: "unavailable",
      stuntingScreening: null,
    };
  }

  return {
    measurementQuality:
      heightCm === null || weightKg === null ? "incomplete" : "valid",
    measurementReason:
      heightCm === null || weightKg === null
        ? "Pengukuran tinggi dan berat belum lengkap."
        : null,
    heightForAgeZ: height.heightForAgeZ,
    weightForAgeZ,
    growthStatus: height.growthStatus,
    stuntingScreening: height.stuntingScreening,
  };
}
