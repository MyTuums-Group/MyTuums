ALTER TABLE "comment" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comment" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comment" ADD COLUMN "removal_public_reason" text;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "removal_public_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "suspended_until" timestamp with time zone;