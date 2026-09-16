CREATE TABLE `parent_accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parent_accounts_email_unique` ON `parent_accounts` (`email`);
--> statement-breakpoint
CREATE TABLE `parent_children` (
  `parent_id` text NOT NULL,
  `child_id` text NOT NULL,
  `created_at` integer NOT NULL,
  PRIMARY KEY(`parent_id`,`child_id`),
  FOREIGN KEY (`parent_id`) REFERENCES `parent_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `parent_children_child` ON `parent_children` (`child_id`);
--> statement-breakpoint
CREATE TABLE `parent_account_sessions` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `parent_id` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`parent_id`) REFERENCES `parent_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `parent_account_sessions_parent` ON `parent_account_sessions` (`parent_id`);
--> statement-breakpoint
CREATE INDEX `parent_account_sessions_expiry` ON `parent_account_sessions` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `parent_account_chat_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `parent_id` text NOT NULL,
  `exam_id` text NOT NULL,
  `role` text NOT NULL,
  `content` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`parent_id`) REFERENCES `parent_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`exam_id`) REFERENCES `examinations`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `parent_account_chat_role` CHECK(`role` IN ('user','assistant'))
);
--> statement-breakpoint
CREATE INDEX `parent_account_chat_exam` ON `parent_account_chat_messages` (`parent_id`,`exam_id`,`created_at`);