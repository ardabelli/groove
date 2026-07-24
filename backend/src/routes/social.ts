import { Router } from "express";
import { getSessionUser } from "../lib/session";
import { getPopularPlaylists, getFeedPlaylists, getLikedPlaylistIds } from "../db/playlists";
import type { playlists, users } from "../db/schema";
import type { PlaylistSummaryDTO, SocialListResult } from "../lib/social/types";

const DEFAULT_POPULAR_LIMIT = 6;
const MAX_POPULAR_LIMIT = 20;
const DEFAULT_FEED_LIMIT = 20;
const MAX_FEED_LIMIT = 50;

function toSummaryDTO(
  row: { playlist: typeof playlists.$inferSelect; owner: Pick<typeof users.$inferSelect, "id" | "displayName" | "imageUrl"> },
  likedIds: Set<string>
): PlaylistSummaryDTO {
  const { playlist, owner } = row;
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    curatorNote: playlist.curatorNote,
    moodParameters: playlist.moodParameters,
    trackCount: playlist.tracks.length,
    trackPreview: playlist.tracks.slice(0, 4),
    spotifyUrl: playlist.spotifyUrl,
    likeCount: playlist.likeCount,
    likedByViewer: likedIds.has(playlist.id),
    sharedAt: (playlist.sharedAt ?? playlist.createdAt).toISOString(),
    owner,
  };
}

export const socialRouter = Router();

socialRouter.get("/popular", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_POPULAR_LIMIT, MAX_POPULAR_LIMIT);
  try {
    const rows = await getPopularPlaylists(limit);
    const viewer = getSessionUser(req);
    const likedIds = viewer ? await getLikedPlaylistIds(viewer.id, rows.map((r) => r.playlist.id)) : new Set<string>();
    res.json({
      ok: true,
      data: { playlists: rows.map((r) => toSummaryDTO(r, likedIds)), hasMore: false },
    } satisfies SocialListResult);
  } catch (err) {
    console.error("[GET /api/social/popular]", err);
    res.json({ ok: false, error: "unknown" } satisfies SocialListResult);
  }
});

socialRouter.get("/feed", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_FEED_LIMIT, MAX_FEED_LIMIT);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  try {
    const rows = await getFeedPlaylists({ limit, offset });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const viewer = getSessionUser(req);
    const likedIds = viewer ? await getLikedPlaylistIds(viewer.id, page.map((r) => r.playlist.id)) : new Set<string>();
    res.json({
      ok: true,
      data: { playlists: page.map((r) => toSummaryDTO(r, likedIds)), hasMore },
    } satisfies SocialListResult);
  } catch (err) {
    console.error("[GET /api/social/feed]", err);
    res.json({ ok: false, error: "unknown" } satisfies SocialListResult);
  }
});
