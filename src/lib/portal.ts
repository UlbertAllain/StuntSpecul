import { z } from "zod";
import type { GrowthStatus } from "./growth";
import type { FacialAnalysisStatus } from "./screening";

export const childProfileSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "Kode hanya memakai huruf, angka, titik, garis, atau underscore.",
    ),
  name: z.string().trim().min(2).max(80),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(["male", "female"]),
  guardian: z.string().trim().min(2).max(80),
});
export type ChildProfileInput = z.infer<typeof childProfileSchema>;
export type ChildProfile = ChildProfileInput & {
  id: string;
  createdAt: number;
};
export type Staff = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  active: number;
};
export type Examination = {
  id: string;
  childId: string;
  childName: string;
  childCode: string;
  ageMonths: number;
  sex: "male" | "female";
  deviceId: string;
  deviceName: string;
  status: "queued" | "running" | "completed" | "cancelled";
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  heightForAgeZ: number | null;
  captureStatus: "captured" | "skipped" | "failed" | null;
  facialStatus: FacialAnalysisStatus | null;
  facialProbability: number | null;
  facialReason: string | null;
  facialModelVersion: string | null;
  growthStatus: GrowthStatus;
  createdAt: number;
  completedAt: number | null;
  finalizedAt: number | null;
};
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};
export type ParentAccountSummary = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type ParentAccountView = {
  parent: ParentAccountSummary;
  children: ChildProfile[];
  examinations: Examination[];
  aiAvailable: boolean;
};

export type MirrorAssignment = {
  id: string;
  ageMonths: number;
  sex: "male" | "female";
  status: "queued" | "running";
  cameraEnabled: boolean;
};

export type MonitoringSession = {
  id: string;
  status:
    | "waiting_parent"
    | "parent_connected"
    | "ready"
    | "running"
    | "awaiting_confirmation";
  childName: string | null;
  ageMonths: number | null;
  examStatus: "queued" | "running" | "completed" | null;
  createdAt: number;
  connectedAt: number | null;
  startedAt: number | null;
};

export type MonitoringRecentExam = {
  id: string;
  childName: string;
  ageMonths: number;
  sex: "male" | "female";
  status: "queued" | "running" | "completed" | "cancelled";
  heightCm: number | null;
  weightKg: number | null;
  createdAt: number;
  completedAt: number | null;
  finalizedAt: number | null;
};

export type MonitoringOverview = {
  stats: {
    totalChildren: number;
    todayExaminations: number;
    todayCompleted: number;
    activeSessions: number;
  };
  active: MonitoringSession[];
  recent: MonitoringRecentExam[];
};

export function ageInMonths(birthDate: string, at = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (
    Number.isNaN(birth.getTime()) ||
    birth.toISOString().slice(0, 10) !== birthDate ||
    birth > at
  ) {
    throw new Error("Tanggal lahir tidak valid.");
  }
  return (
    (at.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
    at.getUTCMonth() -
    birth.getUTCMonth() -
    (at.getUTCDate() < birth.getUTCDate() ? 1 : 0)
  );
}
