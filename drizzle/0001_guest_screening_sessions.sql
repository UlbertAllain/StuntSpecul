INSERT OR IGNORE INTO `staff` (`id`,`name`,`email`,`password_hash`,`role`,`active`,`created_at`) VALUES ('guest-screening-system','Guest Screening','guest-screening@system.local','$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxDwbuCVXBQ0DPGCXRWrTjfRBha','staff',0,0);
--> statement-breakpoint
CREATE TABLE `screening_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `mirror_token_hash` text NOT NULL,
  `parent_token_hash` text NOT NULL,
  `status` text DEFAULT 'waiting_parent' NOT NULL,
  `child_id` text,
  `exam_id` text,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `connected_at` integer,
  `started_at` integer,
  `completed_at` integer,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`exam_id`) REFERENCES `examinations`(`id`) ON UPDATE no action ON DELETE no action,
  CONSTRAINT "screening_session_status" CHECK(`status` IN ('waiting_parent','parent_connected','ready','running','completed','cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `screening_sessions_mirror_token_hash_unique` ON `screening_sessions` (`mirror_token_hash`);
--> statement-breakpoint
CREATE UNIQUE INDEX `screening_sessions_parent_token_hash_unique` ON `screening_sessions` (`parent_token_hash`);
--> statement-breakpoint
CREATE UNIQUE INDEX `screening_session_exam` ON `screening_sessions` (`exam_id`);
--> statement-breakpoint
CREATE INDEX `screening_session_expiry` ON `screening_sessions` (`expires_at`);