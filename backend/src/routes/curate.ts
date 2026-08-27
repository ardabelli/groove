import { Router } from "express";
import { z } from "zod";
import { AuthError, getAuthContext } from "../lib/session";
import { getTopTracks, getTopArtists, type TimeRange } from "../lib/spotify/top-items";
import { SpotifyRateLimitError } from "../lib/spotify/errors";
import { buildTasteProfile } from "../lib/agent/taste-profile";
import { runCurator, AgentError } from "../lib/agent/curator";
import { buildTracklist } from "../lib/agent/build-tracklist";
import { createPromptRecord } from "../db/prompts";
import { getUserById, spendCredit } from "../db/users";
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
  let userId: string;
  try {
    ({ accessToken, userId } = await getAuthContext(req, res));
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

  const dbUser = await getUserById(userId);
  const isAdmin = dbUser?.isAdmin ?? false;

  // Each curate attempt costs real LLM token spend once it reaches the agent, so the
  // credit is spent up front for the attempt rather than only on a successful result.
  // Admins have unlimited prompts and never touch their credit balance.
  let creditsRemaining = dbUser?.credits ?? 0;
  if (!isAdmin) {
    const remaining = await spendCredit(userId);
    if (remaining === null) {
      res.json({ ok: false, error: "insufficient_credits" } satisfies CurateResult);
      return;
    }
    creditsRemaining = remaining;
  }

  try {
    await createPromptRecord({ userId, vibe });
  } catch (dbErr) {
    console.error("[POST /api/curate] failed to persist prompt history", dbErr);
  }

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
        creditsRemaining,
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
