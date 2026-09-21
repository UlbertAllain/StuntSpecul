import { heightForAgeAtZScore, type Sex } from "./growth.ts";

export type DemoMeasurementInput = {
  ageMonths: number;
  sex: Sex;
};

export type DemoMeasurements = {
  heightCm: number;
  weightKg: number;
  targetZScore: number;
  scenario: "normal" | "monitor" | "stunted" | "severe";
};

const SCENARIOS = [
  { targetZScore: -0.4, scenario: "normal" },
  { targetZScore: -1.4, scenario: "monitor" },
  { targetZScore: -2.4, scenario: "stunted" },
  { targetZScore: -3.4, scenario: "severe" },
] as const;

export function demoMeasurementsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MEASUREMENTS === "true";
}

export function generateDemoMeasurements(
  child: DemoMeasurementInput,
): DemoMeasurements {
  const selected = SCENARIOS[child.ageMonths % SCENARIOS.length];
  const heightCm = heightForAgeAtZScore(
    child.ageMonths,
    child.sex,
    selected.targetZScore,
  );

  if (heightCm === null) {
    throw new Error("Usia di luar cakupan data demo pengukuran.");
  }

  const baseWeight =
    child.sex === "male"
      ? 12.5 + Math.max(0, child.ageMonths - 24) * 0.18
      : 11.9 + Math.max(0, child.ageMonths - 24) * 0.17;

  const weightKg = Math.round(baseWeight * 10) / 10;

  return {
    heightCm,
    weightKg,
    targetZScore: selected.targetZScore,
    scenario: selected.scenario,
  };
}
