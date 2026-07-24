CREATE TABLE "prompt_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vibe" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_history" ADD CONSTRAINT "prompt_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prompt_history_user_id_idx" ON "prompt_history" USING btree ("user_id","created_at");