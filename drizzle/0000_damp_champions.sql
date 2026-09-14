CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_hash` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_hash`) REFERENCES `sessions`(`token_hash`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chat_role" CHECK("chat_messages"."role" IN ('user','assistant'))
);
--> statement-breakpoint
CREATE INDEX `chat_session_time` ON `chat_messages` (`session_hash`,`created_at`);--> statement-breakpoint
CREATE TABLE `children` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`birth_date` text NOT NULL,
	`sex` text NOT NULL,
	`guardian` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "child_sex" CHECK("children"."sex" IN ('male','female'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `children_code_unique` ON `children` (`code`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_hash` text,
	`pair_hash` text,
	`pair_expires` integer,
	`active` integer DEFAULT 1 NOT NULL,
	`last_seen` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_token` ON `devices` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_pair` ON `devices` (`pair_hash`);--> statement-breakpoint
CREATE TABLE `examinations` (
	`id` text PRIMARY KEY NOT NULL,
	`child_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`device_id` text NOT NULL,
	`age_months` integer NOT NULL,
	`sex` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`height_cm` real,
	`weight_kg` real,
	`bmi` real,
	`capture_status` text,
	`growth_status` text DEFAULT 'unavailable' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "exam_status" CHECK("examinations"."status" IN ('queued','running','completed','cancelled')),
	CONSTRAINT "exam_age" CHECK("examinations"."age_months" BETWEEN 0 AND 59),
	CONSTRAINT "exam_capture" CHECK("examinations"."capture_status" IS NULL OR "examinations"."capture_status" IN ('captured','skipped','failed')),
	CONSTRAINT "exam_height" CHECK("examinations"."height_cm" IS NULL OR "examinations"."height_cm" > 0),
	CONSTRAINT "exam_weight" CHECK("examinations"."weight_kg" IS NULL OR "examinations"."weight_kg" > 0)
);
--> statement-breakpoint
CREATE INDEX `exams_child_time` ON `examinations` (`child_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `exams_time` ON `examinations` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_exam_per_device` ON `examinations` (`device_id`) WHERE "examinations"."status" IN ('queued','running');--> statement-breakpoint
CREATE TABLE `facility` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	CONSTRAINT "one_facility" CHECK("facility"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_expiry` ON `rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `result_links` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`exam_id` text NOT NULL,
	`created_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `examinations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `result_links_token_hash_unique` ON `result_links` (`token_hash`);--> statement-breakpoint
CREATE INDEX `links_exam` ON `result_links` (`exam_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`staff_id` text,
	`link_id` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`chat_count` integer DEFAULT 0 NOT NULL,
	`busy_until` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`link_id`) REFERENCES `result_links`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_owner" CHECK(("sessions"."kind"='staff' AND "sessions"."staff_id" IS NOT NULL AND "sessions"."link_id" IS NULL) OR ("sessions"."kind"='parent' AND "sessions"."link_id" IS NOT NULL AND "sessions"."staff_id" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_parent_link` ON `sessions` (`link_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "staff_role" CHECK("staff"."role" IN ('admin','staff')),
	CONSTRAINT "staff_active" CHECK("staff"."active" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_email_unique` ON `staff` (`email`);