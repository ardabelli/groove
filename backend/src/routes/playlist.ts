import { Router } from "express";
import { z } from "zod";
import { AuthError, getAuthContext, getSessionUser } from "../lib/session";
import { createPlaylist, addTracksToPlaylist } from "../lib/spotify/playlists";
import { SpotifyRateLimitError } from "../lib/spotify/errors";
import { getUserById } from "../db/users";
import {
  createPlaylistRecord,
  getPlaylistById,
  sharePlaylist,
  unsharePlaylist,
  adminUnsharePlaylist,
  toggleLike,
} from "../db/playlists";
import type { CreatePlaylistResult } from "../lib/agent/types";
import type { ShareResult, LikeResult } from "../lib/social/types";

const TrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  uri: z.string(),
  artistNames: z.string(),
  albumImageUrl: z.string().nullable(),
  spotifyUrl: z.string(),
});

const BodySchema = z.object({
  playlistTitle: z.string().min(1).max(60),
  playlistDescription: z.string().min(1).max(300),
  curatorNote: z.string().min(1).max(600),
  moodParameters: z.object({
    energy: z.enum(["low", "medium", "high"]),
    descriptors: z.array(z.string()).max(6),
    ordering_intent: z.string(),
  }),
  tracks: z.array(TrackSchema).min(1),
});

export const playlistRouter = Router();

playlistRouter.post("/", async (req, res) => {
  let userId: string;
  let accessToken: string;
  try {
    ({ userId, accessToken } = await getAuthContext(req, res));
  } catch (err) {
    if (err instanceof AuthError) {
      res.json({ ok: false, error: "unauthenticated" } satisfies CreatePlaylistResult);
      return;
    }
    throw err;
  }

  const parsedBody = BodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      ok: false,
      error: "unknown",
      message: "Invalid request body",
    } satisfies CreatePlaylistResult);
    return;
  }
  const { playlistTitle, playlistDescription, curatorNote, moodParameters, tracks } = parsedBody.data;
  const trackUris = tracks.map((t) => t.uri);

  try {
    const playlist = await createPlaylist(accessToken, {
      name: `Groove — ${playlistTitle}`,
      description: playlistDescription,
      public: false,
    });

    await addTracksToPlaylist(accessToken, playlist.id, trackUris);

    let recordId: string | null = null;
    try {
      const record = await createPlaylistRecord({
        ownerId: userId,
        title: playlistTitle,
        description: playlistDescription,
        curatorNote,
        moodParameters,
        tracks,
        spotifyPlaylistId: playlist.id,
        spotifyUrl: playlist.external_urls.spotify,
      });
      recordId = record.id;
      await sharePlaylist(record.id, userId);
    } catch (dbErr) {
      console.error("[POST /api/playlist] failed to persist/share playlist record", dbErr);
    }

    res.json({
      ok: true,
      data: {
        id: recordId,
        playlistName: playlist.name,
        externalUrl: playlist.external_urls.spotify,
      },
    } satisfies CreatePlaylistResult);
  } catch (err) {
    if (err instanceof SpotifyRateLimitError) {
      res.json({
        ok: false,
        error: "spotify_rate_limited",
        message: err.message,
        retryAfterSeconds: err.retryAfterSeconds,
      } satisfies CreatePlaylistResult);
      return;
    }
    console.error("[POST /api/playlist]", err);
    res.json({
      ok: false,
      error: "unknown",
      message: err instanceof Error ? err.message : undefined,
    } satisfies CreatePlaylistResult);
  }
});

playlistRouter.post("/:id/share", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.json({ ok: false, error: "unauthenticated" } satisfies ShareResult);
    return;
  }

  const { id } = req.params;
  try {
    const existing = await getPlaylistById(id);
    if (!existing) {
      res.json({ ok: false, error: "not_found" } satisfies ShareResult);
      return;
    }
    if (existing.ownerId !== user.id) {
      res.json({ ok: false, error: "forbidden" } satisfies ShareResult);
      return;
    }

    const shared = await sharePlaylist(id, user.id);
    if (!shared || !shared.sharedAt) {
      res.json({ ok: false, error: "unknown" } satisfies ShareResult);
      return;
    }

    res.json({
      ok: true,
      data: { id: shared.id, isShared: true, sharedAt: shared.sharedAt.toISOString() },
    } satisfies ShareResult);
  } catch (err) {
    console.error("[POST /api/playlist/:id/share]", err);
    res.json({ ok: false, error: "unknown" } satisfies ShareResult);
  }
});

playlistRouter.post("/:id/unshare", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.json({ ok: false, error: "unauthenticated" } satisfies ShareResult);
    return;
  }

  const { id } = req.params;
  try {
    const existing = await getPlaylistById(id);
    if (!existing) {
      res.json({ ok: false, error: "not_found" } satisfies ShareResult);
      return;
    }

    const isOwner = existing.ownerId === user.id;
    if (!isOwner) {
      const dbUser = await getUserById(user.id);
      if (!dbUser?.isAdmin) {
        res.json({ ok: false, error: "forbidden" } satisfies ShareResult);
        return;
      }
    }

    // Admins moderating someone else's shared playlist bypass the ownership check;
    // owners removing their own playlist from the feed go through the normal path.
    const unshared = isOwner ? await unsharePlaylist(id, user.id) : await adminUnsharePlaylist(id);
    if (!unshared) {
      res.json({ ok: false, error: "unknown" } satisfies ShareResult);
      return;
    }

    res.json({
      ok: true,
      data: { id: unshared.id, isShared: false, sharedAt: null },
    } satisfies ShareResult);
  } catch (err) {
    console.error("[POST /api/playlist/:id/unshare]", err);
    res.json({ ok: false, error: "unknown" } satisfies ShareResult);
  }
});

playlistRouter.post("/:id/like", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.json({ ok: false, error: "unauthenticated" } satisfies LikeResult);
    return;
  }

  const { id } = req.params;
  try {
    const existing = await getPlaylistById(id);
    if (!existing || !existing.isShared) {
      res.json({ ok: false, error: "not_found" } satisfies LikeResult);
      return;
    }

    const result = await toggleLike(id, user.id);
    res.json({ ok: true, data: result } satisfies LikeResult);
  } catch (err) {
    console.error("[POST /api/playlist/:id/like]", err);
    res.json({ ok: false, error: "unknown" } satisfies LikeResult);
  }
});
