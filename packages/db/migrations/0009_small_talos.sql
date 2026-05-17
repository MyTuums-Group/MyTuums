CREATE TABLE "profile_media_replacement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"slot" text NOT NULL,
	"old_media_id" uuid,
	"new_media_id" uuid,
	"replaced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "attached_target_type" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "attached_target_id" uuid;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "attached_slot" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "attached_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profile_media_replacement" ADD CONSTRAINT "profile_media_replacement_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_media_replacement_profile_id_idx" ON "profile_media_replacement" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_media_replacement_old_media_id_idx" ON "profile_media_replacement" USING btree ("old_media_id");--> statement-breakpoint
CREATE INDEX "profile_media_replacement_new_media_id_idx" ON "profile_media_replacement" USING btree ("new_media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_post_attachment_target_unique" ON "media" USING btree ("attached_target_type","attached_target_id","attached_slot") WHERE "media"."status" = 'attached'
          and "media"."attached_target_type" = 'post'
          and "media"."attached_slot" = 'post_attachment';