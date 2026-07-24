export interface TrackDTO {
  id: string;
  name: string;
  uri: string;
  artistNames: string;
  albumImageUrl: string | null;
  spotifyUrl: string;
}

export interface MoodParameters {
  energy: "low" | "medium" | "high";
  descriptors: string[];
  ordering_intent: string;
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
        moodParameters: MoodParameters;
        usedPersonalization: boolean;
        tracks: TrackDTO[];
      };
    }
  | { ok: false; error: CurateErrorCode; message?: string };

export type PlaylistErrorCode = "unauthenticated" | "spotify_rate_limited" | "unknown";

export type CreatePlaylistResult =
  | { ok: true; data: { id: string | null; playlistName: string; externalUrl: string } }
  | { ok: false; error: PlaylistErrorCode; message?: string; retryAfterSeconds?: number };

export interface PlaylistSummaryDTO {
  id: string;
  title: string;
  description: string;
  curatorNote: string;
  moodParameters: MoodParameters;
  trackCount: number;
  trackPreview: TrackDTO[];
  spotifyUrl: string;
  likeCount: number;
  likedByViewer: boolean;
  sharedAt: string;
  owner: { id: string; displayName: string | null; imageUrl: string | null };
}

export type ShareErrorCode = "unauthenticated" | "not_found" | "forbidden" | "unknown";

export type ShareResult =
  | { ok: true; data: { id: string; sharedAt: string } }
  | { ok: false; error: ShareErrorCode; message?: string };

export type LikeErrorCode = "unauthenticated" | "not_found" | "unknown";

export type LikeResult =
  | { ok: true; data: { liked: boolean; likeCount: number } }
  | { ok: false; error: LikeErrorCode; message?: string };

export type SocialListResult =
  | { ok: true; data: { playlists: PlaylistSummaryDTO[]; hasMore: boolean } }
  | { ok: false; error: "unknown"; message?: string };
