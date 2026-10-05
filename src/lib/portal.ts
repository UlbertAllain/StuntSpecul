import { z } from "zod";
import type { MeasurementQuality } from "./anthropometry";
import type { GrowthStatus } from "./growth";
import type { GrowthRecommendations } from "./growth-recommendations";
import type { FacialAnalysisStatus, VisualAnalysis } from "./screening";

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
  nik: z
    .string()
    .regex(/^\d{16}$/, "NIK anak harus terdiri dari 16 digit.")
    .nullable()
    .optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(["male", "female"]),
  guardian: z.string().trim().min(2).max(80),
});
export type ChildProfileInput = z.infer<typeof childProfileSchema>;
export type ChildProfile = Omit<ChildProfileInput, "nik"> & {
  id: string;
  nik: string | null;
  createdAt: number;
  latestFacePhotoUrl: string | null;
  latestFacePhotoUpdatedAt: number | null;
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
  measurementMode: "device" | "manual_infant" | "manual";
  status: "queued" | "running" | "completed" | "cancelled";
  cameraEnabled: boolean;
  stationStep:
    | "camera"
    | "prepare"
    | "height"
    | "weight"
    | "analysis"
    | "result"
    | null;
  stationAttention: "camera_retry_required" | null;
  stationAttentionMessage: string | null;
  stationControlId: string | null;
  stationControlAction: "retry_camera" | "skip_camera" | null;
  stationControlAckId: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  heightForAgeZ: number | null;
  weightForAgeZ: number | null;
  measurementQuality: MeasurementQuality;
  measurementReason: string | null;
  captureStatus: "captured" | "skipped" | "failed" | null;
  facialStatus: FacialAnalysisStatus | null;
  facialProbability: number | null;
  facialReason: string | null;
  facialModelVersion: string | null;
  visualAnalysis: VisualAnalysis | null;
  growthStatus: GrowthStatus;
  recommendations: GrowthRecommendations;
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

export const blogCategories = [
  "nutrition",
  "healthy_habits",
  "stunting_risk",
  "growth",
] as const;

export type BlogCategory = (typeof blogCategories)[number];
export type BlogStatus = "draft" | "published";

export const blogInputSchema = z
  .object({
    title: z.string().trim().min(5).max(120),
    excerpt: z.string().trim().min(10).max(280),
    content: z.string().trim().min(30).max(12000),
    category: z.enum(blogCategories),
    status: z.enum(["draft", "published"]),
  })
  .strict();

export type BlogPostInput = z.infer<typeof blogInputSchema>;

export type BlogPost = BlogPostInput & {
  id: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
};

export type BlogPostSummary = Omit<BlogPost, "content">;

export function blogCategoryLabel(category: BlogCategory): string {
  switch (category) {
    case "nutrition":
      return "Nutrisi";
    case "healthy_habits":
      return "Kebiasaan baik";
    case "stunting_risk":
      return "Risiko stunting";
    case "growth":
      return "Pertumbuhan anak";
  }
}

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

export type DetailedAge = {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
};

export function detailedAge(birthDate: string, at = new Date()): DetailedAge {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) throw new Error("Tanggal lahir tidak valid.");

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const birthMs = Date.UTC(year, monthIndex, day);
  const birth = new Date(birthMs);

  if (
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== monthIndex ||
    birth.getUTCDate() !== day
  ) {
    throw new Error("Tanggal lahir tidak valid.");
  }

  const targetMs = Date.UTC(at.getFullYear(), at.getMonth(), at.getDate());
  if (birthMs > targetMs) throw new Error("Tanggal lahir tidak valid.");

  const target = new Date(targetMs);
  let totalMonths =
    (target.getUTCFullYear() - year) * 12 + target.getUTCMonth() - monthIndex;

  if (target.getUTCDate() < day) totalMonths -= 1;

  const anchorMonthIndex = monthIndex + totalMonths;
  const anchorYear = year + Math.floor(anchorMonthIndex / 12);
  const anchorMonth = anchorMonthIndex % 12;
  const lastAnchorDay = new Date(
    Date.UTC(anchorYear, anchorMonth + 1, 0),
  ).getUTCDate();
  const anchorDay = Math.min(day, lastAnchorDay);
  const anchorMs = Date.UTC(anchorYear, anchorMonth, anchorDay);
  const days = Math.max(
    0,
    Math.floor((targetMs - anchorMs) / (24 * 60 * 60 * 1000)),
  );

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days,
    totalMonths,
  };
}

export function formatDetailedAge(birthDate: string, at = new Date()): string {
  const age = detailedAge(birthDate, at);

  return [
    age.years ? `${age.years} tahun` : "",
    `${age.months} bulan`,
    `${age.days} hari`,
  ]
    .filter(Boolean)
    .join(" ");
}

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
