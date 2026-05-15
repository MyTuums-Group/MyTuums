ALTER TABLE "contact_submission" ADD COLUMN "request_ip_hash" text;--> statement-breakpoint
ALTER TABLE "contact_submission" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "contact_submission" ADD COLUMN "email_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_submission" ADD COLUMN "email_error" text;--> statement-breakpoint
ALTER TABLE "contact_submission" ADD COLUMN "retention_expires_at" timestamp with time zone DEFAULT now() + interval '180 days' NOT NULL;--> statement-breakpoint
CREATE INDEX "contact_submission_retention_idx" ON "contact_submission" USING btree ("retention_expires_at");