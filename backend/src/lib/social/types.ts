import type { TrackDTO } from "../agent/types";
import type { CuratorResponse } from "../agent/schema";

type MoodParameters = CuratorResponse["mood_parameters"];

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
