
import { spotifyFetch } from "./client";
import type { SpotifyTrack } from "./types";

interface SearchResponse {
  tracks?: { items: SpotifyTrack[] };
}

export async function searchTracks(
  accessToken: string,
  query: string,
  { limit = 3, market }: { limit?: number; market?: string } = {}
): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(limit),
  });
  if (market) {
    params.set("market", market);
  }

  const data = await spotifyFetch<SearchResponse>(
    `/search?${params.toString()}`,
    accessToken
  );
  return data?.tracks?.items ?? [];
}
