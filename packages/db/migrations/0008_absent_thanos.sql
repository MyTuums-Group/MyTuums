CREATE TABLE "account_deletion_hold" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"held_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_deletion_hold" ADD CONSTRAINT "account_deletion_hold_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_deletion_hold_kind_value_idx" ON "account_deletion_hold" USING btree ("kind","value");--> statement-breakpoint
CREATE INDEX "account_deletion_hold_held_until_idx" ON "account_deletion_hold" USING btree ("held_until");--> statement-breakpoint
CREATE INDEX "account_deletion_hold_user_id_idx" ON "account_deletion_hold" USING btree ("user_id");