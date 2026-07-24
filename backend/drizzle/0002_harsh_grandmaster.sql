CREATE TABLE "playlist_likes" (
	"playlist_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playlist_likes_playlist_id_user_id_pk" PRIMARY KEY("playlist_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"curator_note" text NOT NULL,
	"mood_parameters" jsonb NOT NULL,
	"tracks" jsonb NOT NULL,
	"spotify_playlist_id" text NOT NULL,
	"spotify_url" text NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"shared_at" timestamp,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playlist_likes" ADD CONSTRAINT "playlist_likes_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_likes" ADD CONSTRAINT "playlist_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playlists_owner_id_idx" ON "playlists" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "playlists_shared_feed_idx" ON "playlists" USING btree ("is_shared","shared_at");--> statement-breakpoint
CREATE INDEX "playlists_shared_popular_idx" ON "playlists" USING btree ("is_shared","like_count");