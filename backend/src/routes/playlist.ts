import { Router } from "express";
import { z } from "zod";
import { AuthError, getAuthContext } from "../lib/session";
import { createPlaylist, addTracksToPlaylist } from "../lib/spotify/playlists";
import { SpotifyRateLimitError } from "../lib/spotify/errors";
import type { CreatePlaylistResult } from "../lib/agent/types";

const BodySchema = z.object({
  vibe: z.string().min(1),
  curatorNote: z.string().min(1),
  trackUris: z.array(z.string()).min(1),
});

export const playlistRouter = Router();

playlistRouter.post("/", async (req, res) => {
  let accessToken: string;
  try {
    ({ accessToken } = await getAuthContext(req, res));
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
  const { vibe, curatorNote, trackUris } = parsedBody.data;

  try {
    const playlist = await createPlaylist(accessToken, {
      name: `Groove — ${vibe.slice(0, 60)}`,
      description: curatorNote.slice(0, 300),
      public: false,
    });

    await addTracksToPlaylist(accessToken, playlist.id, trackUris);

    res.json({
      ok: true,
      data: {
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
