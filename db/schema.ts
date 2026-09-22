import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  check,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const facility = sqliteTable(
  "facility",
  { id: integer("id").primaryKey(), name: text("name").notNull() },
  (t) => [check("one_facility", sql`${t.id} = 1`)],
);

export const staff = sqliteTable(
  "staff",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "staff"] }).notNull(),
    active: integer("active").notNull().default(1),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    check("staff_role", sql`${t.role} IN ('admin','staff')`),
    check("staff_active", sql`${t.active} IN (0,1)`),
  ],
);

export const children = sqliteTable(
  "children",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    birthDate: text("birth_date").notNull(),
    sex: text("sex", { enum: ["male", "female"] }).notNull(),
    guardian: text("guardian").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [check("child_sex", sql`${t.sex} IN ('male','female')`)],
);

export const devices = sqliteTable(
  "devices",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    tokenHash: text("token_hash"),
    pairHash: text("pair_hash"),
    pairExpires: integer("pair_expires"),
    active: integer("active").notNull().default(1),
    lastSeen: integer("last_seen"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("devices_token").on(t.tokenHash),
    uniqueIndex("devices_pair").on(t.pairHash),
  ],
);

export const examinations = sqliteTable(
  "examinations",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id),
    staffId: text("staff_id")
      .notNull()
      .references(() => staff.id),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id),
    ageMonths: integer("age_months").notNull(),
    sex: text("sex").notNull(),
    status: text("status").notNull().default("queued"),
    heightCm: real("height_cm"),
    weightKg: real("weight_kg"),
    bmi: real("bmi"),
    captureStatus: text("capture_status"),
    facialStatus: text("facial_status"),
    facialProbability: real("facial_probability"),
    facialReason: text("facial_reason"),
    facialModelVersion: text("facial_model_version"),
    growthStatus: text("growth_status").notNull().default("unavailable"),
    createdAt: integer("created_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (t) => [
    index("exams_child_time").on(t.childId, t.createdAt),
    index("exams_time").on(t.createdAt),
    uniqueIndex("one_active_exam_per_device")
      .on(t.deviceId)
      .where(sql`${t.status} IN ('queued','running')`),
    check(
      "exam_status",
      sql`${t.status} IN ('queued','running','completed','cancelled')`,
    ),
    check("exam_age", sql`${t.ageMonths} BETWEEN 0 AND 59`),
    check(
      "exam_capture",
      sql`${t.captureStatus} IS NULL OR ${t.captureStatus} IN ('captured','skipped','failed')`,
    ),
    check("exam_height", sql`${t.heightCm} IS NULL OR ${t.heightCm} > 0`),
    check("exam_weight", sql`${t.weightKg} IS NULL OR ${t.weightKg} > 0`),
  ],
);

export const examinationWorkflow = sqliteTable("examination_workflow", {
  examId: text("exam_id")
    .primaryKey()
    .references(() => examinations.id, { onDelete: "cascade" }),
  finalizedAt: integer("finalized_at"),
  createdAt: integer("created_at").notNull(),
});

export const screeningSessions = sqliteTable(
  "screening_sessions",
  {
    id: text("id").primaryKey(),
    mirrorTokenHash: text("mirror_token_hash").notNull().unique(),
    parentTokenHash: text("parent_token_hash").notNull().unique(),
    status: text("status").notNull().default("waiting_parent"),
    childId: text("child_id").references(() => children.id),
    examId: text("exam_id").references(() => examinations.id),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
    connectedAt: integer("connected_at"),
    startedAt: integer("started_at"),
    completedAt: integer("completed_at"),
  },
  (t) => [
    uniqueIndex("screening_session_exam").on(t.examId),
    index("screening_session_expiry").on(t.expiresAt),
    check(
      "screening_session_status",
      sql`${t.status} IN ('waiting_parent','parent_connected','ready','running','completed','cancelled')`,
    ),
  ],
);

export const resultLinks = sqliteTable(
  "result_links",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    examId: text("exam_id")
      .notNull()
      .references(() => examinations.id),
    createdBy: text("created_by")
      .notNull()
      .references(() => staff.id),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
    revokedAt: integer("revoked_at"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("links_exam").on(t.examId)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    kind: text("kind").notNull(),
    staffId: text("staff_id").references(() => staff.id),
    linkId: text("link_id").references(() => resultLinks.id),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
    chatCount: integer("chat_count").notNull().default(0),
    busyUntil: integer("busy_until").notNull().default(0),
  },
  (t) => [
    uniqueIndex("sessions_parent_link").on(t.linkId),
    index("sessions_expiry").on(t.expiresAt),
    check(
      "session_owner",
      sql`(${t.kind}='staff' AND ${t.staffId} IS NOT NULL AND ${t.linkId} IS NULL) OR (${t.kind}='parent' AND ${t.linkId} IS NOT NULL AND ${t.staffId} IS NULL)`,
    ),
  ],
);

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    sessionHash: text("session_hash")
      .notNull()
      .references(() => sessions.tokenHash, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("chat_session_time").on(t.sessionHash, t.createdAt),
    check("chat_role", sql`${t.role} IN ('user','assistant')`),
  ],
);

export const parentAccounts = sqliteTable(
  "parent_accounts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    avatarUrl: text("avatar_url"),
    avatarPublicId: text("avatar_public_id"),
    active: integer("active").notNull().default(1),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [check("parent_account_active", sql`${t.active} IN (0,1)`)],
);

export const parentChildren = sqliteTable(
  "parent_children",
  {
    parentId: text("parent_id")
      .notNull()
      .references(() => parentAccounts.id, { onDelete: "cascade" }),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.parentId, t.childId] }),
    index("parent_children_child").on(t.childId),
  ],
);

export const parentAccountSessions = sqliteTable(
  "parent_account_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    parentId: text("parent_id")
      .notNull()
      .references(() => parentAccounts.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("parent_account_sessions_parent").on(t.parentId),
    index("parent_account_sessions_expiry").on(t.expiresAt),
  ],
);

export const parentAccountChatMessages = sqliteTable(
  "parent_account_chat_messages",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id")
      .notNull()
      .references(() => parentAccounts.id, { onDelete: "cascade" }),
    examId: text("exam_id")
      .notNull()
      .references(() => examinations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("parent_account_chat_exam").on(t.parentId, t.examId, t.createdAt),
    check("parent_account_chat_role", sql`${t.role} IN ('user','assistant')`),
  ],
);

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(1),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("rate_expiry").on(t.expiresAt)],
);
