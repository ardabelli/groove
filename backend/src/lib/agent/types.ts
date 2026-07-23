import type { CuratorResponse } from "./schema";

export interface TrackDTO {
  id: string;
  name: string;
  uri: string;
  artistNames: string;
  albumImageUrl: string | null;
  spotifyUrl: string;
}

export type CurateErrorCode =
  | "unauthenticated"
  | "invalid_vibe"
  | "agent_failed"
  | "no_tracks_found"
  | "spotify_rate_limited"
  | "unknown";

export type CurateResult =
  | {
      ok: true;
      data: {
        curatorNote: string;
        playlistTitle: string;
        playlistDescription: string;
        moodParameters: CuratorResponse["mood_parameters"];
        usedPersonalization: boolean;
        tracks: TrackDTO[];
      };
    }
  | { ok: false; error: CurateErrorCode; message?: string };

export type PlaylistErrorCode = "unauthenticated" | "spotify_rate_limited" | "unknown";

export type CreatePlaylistResult =
  | { ok: true; data: { playlistName: string; externalUrl: string } }
  | { ok: false; error: PlaylistErrorCode; message?: string; retryAfterSeconds?: number };
