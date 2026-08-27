import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { playlists, playlistLikes, users } from "./schema";
import type { TrackDTO } from "../lib/agent/types";
import type { CuratorResponse } from "../lib/agent/schema";

type MoodParameters = CuratorResponse["mood_parameters"];

export async function createPlaylistRecord({
  ownerId,
  title,
  description,
  curatorNote,
  moodParameters,
  tracks,
  spotifyPlaylistId,
  spotifyUrl,
}: {
  ownerId: string;
  title: string;
  description: string;
  curatorNote: string;
  moodParameters: MoodParameters;
  tracks: TrackDTO[];
  spotifyPlaylistId: string;
  spotifyUrl: string;
}) {
  const [row] = await db
    .insert(playlists)
    .values({
      ownerId,
      title,
      description,
      curatorNote,
      moodParameters,
      tracks,
      spotifyPlaylistId,
      spotifyUrl,
    })
    .returning();
  return row;
}

export async function getPlaylistById(id: string) {
  const [row] = await db.select().from(playlists).where(eq(playlists.id, id));
  return row ?? null;
}

export async function sharePlaylist(id: string, ownerId: string) {
  const [row] = await db
    .update(playlists)
    .set({ isShared: true, sharedAt: new Date() })
    .where(and(eq(playlists.id, id), eq(playlists.ownerId, ownerId)))
    .returning();
  return row ?? null;
}

export async function unsharePlaylist(id: string, ownerId: string) {
  const [row] = await db
    .update(playlists)
    .set({ isShared: false })
    .where(and(eq(playlists.id, id), eq(playlists.ownerId, ownerId)))
    .returning();
  return row ?? null;
}

/** Moderation action: removes any playlist from the social feed regardless of owner. */
export async function adminUnsharePlaylist(id: string) {
  const [row] = await db
    .update(playlists)
    .set({ isShared: false })
    .where(eq(playlists.id, id))
    .returning();
  return row ?? null;
}

const ownerSelection = {
  id: users.id,
  displayName: users.displayName,
  imageUrl: users.imageUrl,
};

export async function getPlaylistsByOwner(ownerId: string) {
  return db
    .select({ playlist: playlists, owner: ownerSelection })
    .from(playlists)
    .innerJoin(users, eq(playlists.ownerId, users.id))
    .where(eq(playlists.ownerId, ownerId))
    .orderBy(desc(playlists.createdAt));
}

export async function getPopularPlaylists(limit: number) {
  return db
    .select({ playlist: playlists, owner: ownerSelection })
    .from(playlists)
    .innerJoin(users, eq(playlists.ownerId, users.id))
    .where(eq(playlists.isShared, true))
    .orderBy(desc(playlists.likeCount), desc(playlists.createdAt))
    .limit(limit);
}

export async function getFeedPlaylists({ limit, offset }: { limit: number; offset: number }) {
  return db
    .select({ playlist: playlists, owner: ownerSelection })
    .from(playlists)
    .innerJoin(users, eq(playlists.ownerId, users.id))
    .where(eq(playlists.isShared, true))
    .orderBy(desc(playlists.sharedAt))
    .limit(limit + 1)
    .offset(offset);
}

export async function toggleLike(playlistId: string, userId: string) {
  const inserted = await db
    .insert(playlistLikes)
    .values({ playlistId, userId })
    .onConflictDoNothing()
    .returning({ playlistId: playlistLikes.playlistId });

  if (inserted.length > 0) {
    const [row] = await db
      .update(playlists)
      .set({ likeCount: sql`${playlists.likeCount} + 1` })
      .where(eq(playlists.id, playlistId))
      .returning({ likeCount: playlists.likeCount });
    return { liked: true, likeCount: row?.likeCount ?? 0 };
  }

  await db
    .delete(playlistLikes)
    .where(and(eq(playlistLikes.playlistId, playlistId), eq(playlistLikes.userId, userId)));
  const [row] = await db
    .update(playlists)
    .set({ likeCount: sql`greatest(${playlists.likeCount} - 1, 0)` })
    .where(eq(playlists.id, playlistId))
    .returning({ likeCount: playlists.likeCount });
  return { liked: false, likeCount: row?.likeCount ?? 0 };
}

export async function getLikedPlaylistIds(userId: string, playlistIds: string[]): Promise<Set<string>> {
  if (playlistIds.length === 0) return new Set();
  const rows = await db
    .select({ playlistId: playlistLikes.playlistId })
    .from(playlistLikes)
    .where(and(eq(playlistLikes.userId, userId), inArray(playlistLikes.playlistId, playlistIds)));
  return new Set(rows.map((r) => r.playlistId));
}
