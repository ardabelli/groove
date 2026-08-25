CREATE TABLE "ad_rewards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"redeemed_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "credits" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "ad_rewards" ADD CONSTRAINT "ad_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_rewards_user_id_idx" ON "ad_rewards" USING btree ("user_id");