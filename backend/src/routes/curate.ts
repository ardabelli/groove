import { Router } from "express";
import { z } from "zod";
import { AuthError, getAuthContext } from "../lib/session";
import { getTopTracks, getTopArtists, type TimeRange } from "../lib/spotify/top-items";
import { SpotifyRateLimitError } from "../lib/spotify/errors";
import { buildTasteProfile } from "../lib/agent/taste-profile";
import { runCurator, AgentError } from "../lib/agent/curator";
import { buildTracklist } from "../lib/agent/build-tracklist";
import type { CurateResult, TrackDTO } from "../lib/agent/types";

const VibeSchema = z.string().trim().min(3, "Tell me a bit more about the vibe.").max(300);

const TIME_RANGE_CASCADE: TimeRange[] = ["medium_term", "long_term", "short_term"];

async function fetchTasteData(accessToken: string) {
  for (const timeRange of TIME_RANGE_CASCADE) {
    const [tracks, artists] = await Promise.all([
      getTopTracks(accessToken, { timeRange }),
      getTopArtists(accessToken, { timeRange }),
    ]);
    if (tracks.length > 0 || artists.length > 0) {
      return { tracks, artists };
    }
  }
  return { tracks: [], artists: [] };
}

function toTrackDTO(track: {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  external_urls: { spotify: string };
}): TrackDTO {
  return {
    id: track.id,
    name: track.name,
    uri: track.uri,
    artistNames: track.artists.map((a) => a.name).join(", "),
    albumImageUrl: track.album.images[0]?.url ?? null,
    spotifyUrl: track.external_urls.spotify,
  };
}

export const curateRouter = Router();

curateRouter.post("/", async (req, res) => {
  let accessToken: string;
  try {
    ({ accessToken } = await getAuthContext(req, res));
  } catch (err) {
    if (err instanceof AuthError) {
      res.json({ ok: false, error: "unauthenticated" } satisfies CurateResult);
      return;
    }
    throw err;
  }

  const parsedVibe = VibeSchema.safeParse(req.body?.vibe);
  if (!parsedVibe.success) {
    res.json({
      ok: false,
      error: "invalid_vibe",
      message: parsedVibe.error.issues[0]?.message,
    } satisfies CurateResult);
    return;
  }
  const vibe = parsedVibe.data;

  try {
    const { tracks: topTracks, artists: topArtists } = await fetchTasteData(accessToken);
    const tasteProfile = buildTasteProfile(topTracks, topArtists);

    const curatorResponse = await runCurator({ vibe, tasteProfile });

    const tracks = await buildTracklist(accessToken, curatorResponse.tracks);
    if (tracks.length === 0) {
      res.json({ ok: false, error: "no_tracks_found" } satisfies CurateResult);
      return;
    }

    res.json({
      ok: true,
      data: {
        curatorNote: curatorResponse.curator_note,
        playlistTitle: curatorResponse.playlist_title,
        playlistDescription: curatorResponse.playlist_description,
        moodParameters: curatorResponse.mood_parameters,
        usedPersonalization: !tasteProfile.empty,
        tracks: tracks.map(toTrackDTO),
      },
    } satisfies CurateResult);
  } catch (err) {
    if (err instanceof AgentError) {
      res.json({ ok: false, error: "agent_failed", message: err.message } satisfies CurateResult);
      return;
    }
    if (err instanceof SpotifyRateLimitError) {
      res.json({ ok: false, error: "spotify_rate_limited", message: err.message } satisfies CurateResult);
      return;
    }
    console.error("[POST /api/curate]", err);
    res.json({
      ok: false,
      error: "unknown",
      message: err instanceof Error ? err.message : undefined,
    } satisfies CurateResult);
  }
});
