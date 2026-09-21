import { heightForAgeAtZScore, type Sex } from "./growth.ts";

export type DemoMeasurementInput = {
  ageMonths: number;
  sex: Sex;
};

export type DemoMeasurements = {
  heightCm: number;
  weightKg: number;
  generatedZScore: number;
};

export type RandomSource = () => number;

export function createSeededRandom(seed: string): RandomSource {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN_DEMO_Z = -3.6;
const MAX_DEMO_Z = 1.4;
const MIN_WEIGHT_FACTOR = 0.88;
const MAX_WEIGHT_FACTOR = 1.12;

function normalizedRandom(random: RandomSource): number {
  const value = random();
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function randomBetween(min: number, max: number, random: RandomSource): number {
  return min + (max - min) * normalizedRandom(random);
}

export function demoMeasurementsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MEASUREMENTS === "true";
}

export function generateDemoMeasurements(
  child: DemoMeasurementInput,
  random: RandomSource = Math.random,
): DemoMeasurements {
  // Development-only readings are randomized for each examination.
  // The WHO engine still receives only the resulting height and independently
  // decides the TB/U category; the demo generator does not pick a status label.
  const generatedZScore = randomBetween(MIN_DEMO_Z, MAX_DEMO_Z, random);
  const heightCm = heightForAgeAtZScore(
    child.ageMonths,
    child.sex,
    generatedZScore,
  );

  if (heightCm === null) {
    throw new Error("Usia di luar cakupan data demo pengukuran.");
  }

  const baseWeight =
    child.sex === "male"
      ? 12.5 + Math.max(0, child.ageMonths - 24) * 0.18
      : 11.9 + Math.max(0, child.ageMonths - 24) * 0.17;

  const weightFactor = randomBetween(
    MIN_WEIGHT_FACTOR,
    MAX_WEIGHT_FACTOR,
    random,
  );
  const weightKg = Math.round(baseWeight * weightFactor * 10) / 10;

  return {
    heightCm,
    weightKg,
    generatedZScore: Math.round(generatedZScore * 100) / 100,
  };
}
