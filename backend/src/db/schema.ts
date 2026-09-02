import { pgTable, text, timestamp, boolean, integer, jsonb, primaryKey, index } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import type { TrackDTO } from "../lib/agent/types";
import type { CuratorResponse } from "../lib/agent/schema";

type MoodParameters = CuratorResponse["mood_parameters"];

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  imageUrl: text("image_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const playlists = pgTable(
  "playlists",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    curatorNote: text("curator_note").notNull(),
    moodParameters: jsonb("mood_parameters").$type<MoodParameters>().notNull(),
    tracks: jsonb("tracks").$type<TrackDTO[]>().notNull(),
    spotifyPlaylistId: text("spotify_playlist_id").notNull(),
    spotifyUrl: text("spotify_url").notNull(),
    isShared: boolean("is_shared").notNull().default(false),
    sharedAt: timestamp("shared_at"),
    likeCount: integer("like_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("playlists_owner_id_idx").on(table.ownerId),
    index("playlists_shared_feed_idx").on(table.isShared, table.sharedAt),
    index("playlists_shared_popular_idx").on(table.isShared, table.likeCount),
  ]
);

export const promptHistory = pgTable(
  "prompt_history",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vibe: text("vibe").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("prompt_history_user_id_idx").on(table.userId, table.createdAt)]
);

export const playlistLikes = pgTable(
  "playlist_likes",
  {
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.playlistId, table.userId] })]
);
