CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`team_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`match_score` integer NOT NULL,
	`match_rationale` text NOT NULL,
	`per_question_alignment` text DEFAULT '[]' NOT NULL,
	`pitch` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apps_project_team_uniq` ON `applications` (`project_id`,`team_id`);--> statement-breakpoint
CREATE INDEX `apps_project_idx` ON `applications` (`project_id`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`website` text,
	`logo_url` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`business_plan` text NOT NULL,
	`end_goal` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`accepted_team_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `projects_company_idx` ON `projects` (`company_id`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE TABLE `publications` (
	`id` text PRIMARY KEY NOT NULL,
	`researcher_id` text NOT NULL,
	`openalex_work_id` text,
	`title` text NOT NULL,
	`year` integer,
	`venue` text,
	`abstract` text,
	`citation_count` integer DEFAULT 0 NOT NULL,
	`doi` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`researcher_id`) REFERENCES `researchers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `publications_researcher_idx` ON `publications` (`researcher_id`);--> statement-breakpoint
CREATE TABLE `report_files` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`filename` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `report_findings` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`research_question_id` text NOT NULL,
	`finding` text NOT NULL,
	`business_translation` text NOT NULL,
	`impact_note` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`research_question_id`) REFERENCES `research_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rf_report_idx` ON `report_findings` (`report_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`team_id` text NOT NULL,
	`week_of` text NOT NULL,
	`raw_markdown` text NOT NULL,
	`submitted_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reports_project_idx` ON `reports` (`project_id`);--> statement-breakpoint
CREATE TABLE `research_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`question` text NOT NULL,
	`rationale` text NOT NULL,
	`order_index` integer NOT NULL,
	`ai_generated` integer DEFAULT true NOT NULL,
	`concepts` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rq_project_idx` ON `research_questions` (`project_id`);--> statement-breakpoint
CREATE TABLE `researcher_concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`researcher_id` text NOT NULL,
	`concept` text NOT NULL,
	`score` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`researcher_id`) REFERENCES `researchers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rc_researcher_idx` ON `researcher_concepts` (`researcher_id`);--> statement-breakpoint
CREATE TABLE `researchers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`openalex_id` text,
	`orcid` text,
	`affiliation` text,
	`headline` text,
	`ai_summary` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `team_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`code` text NOT NULL,
	`invited_email` text,
	`expires_at` integer NOT NULL,
	`used_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`used_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_invites_code_idx` ON `team_invites` (`code`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_uniq` ON `team_members` (`team_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `tm_team_idx` ON `team_members` (`team_id`);--> statement-breakpoint
CREATE INDEX `tm_user_idx` ON `team_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_id_idx` ON `users` (`clerk_id`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);