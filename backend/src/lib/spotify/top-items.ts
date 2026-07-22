
import { spotifyFetch } from "./client";
import type { SpotifyArtist, SpotifyTrack } from "./types";

export type TimeRange = "short_term" | "medium_term" | "long_term";

interface Paged<T> {
  items: T[];
}

export async function getTopTracks(
  accessToken: string,
  { timeRange = "medium_term", limit = 50 }: { timeRange?: TimeRange; limit?: number } = {}
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<Paged<SpotifyTrack>>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    accessToken
  );
  return data?.items ?? [];
}

export async function getTopArtists(
  accessToken: string,
  { timeRange = "medium_term", limit = 50 }: { timeRange?: TimeRange; limit?: number } = {}
): Promise<SpotifyArtist[]> {
  const data = await spotifyFetch<Paged<SpotifyArtist>>(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    accessToken
  );
  return data?.items ?? [];
}
