ALTER TABLE examinations ADD COLUMN facial_status TEXT;
--> statement-breakpoint
ALTER TABLE examinations ADD COLUMN facial_probability REAL;
--> statement-breakpoint
ALTER TABLE examinations ADD COLUMN facial_reason TEXT;
--> statement-breakpoint
ALTER TABLE examinations ADD COLUMN facial_model_version TEXT;
