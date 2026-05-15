ALTER TABLE "profile" ADD COLUMN "follower_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "following_count" integer DEFAULT 0 NOT NULL;