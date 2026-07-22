
import type { SpotifyArtist, SpotifyTrack } from "../spotify/types";

export interface TasteProfile {
  empty: false;
  topArtists: string[];
  topGenres: string[];
  sampleTracks: { title: string; artist: string }[];
}

export interface EmptyTasteProfile {
  empty: true;
}

export function buildTasteProfile(
  topTracks: SpotifyTrack[],
  topArtists: SpotifyArtist[]
): TasteProfile | EmptyTasteProfile {
  if (topTracks.length === 0 && topArtists.length === 0) {
    return { empty: true };
  }

  const artistNames = Array.from(new Set(topArtists.map((a) => a.name))).slice(0, 15);

  const genreCounts = new Map<string, number>();
  for (const artist of topArtists) {
    for (const genre of artist.genres ?? []) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre]) => genre);

  const sampleTracks = topTracks.slice(0, 15).map((t) => ({
    title: t.name,
    artist: t.artists[0]?.name ?? "Unknown",
  }));

  return { empty: false, topArtists: artistNames, topGenres, sampleTracks };
}

export function formatTasteProfileForPrompt(profile: TasteProfile | EmptyTasteProfile): string {
  if (profile.empty) {
    return "No listening history is available for this user. Curate from the vibe description alone.";
  }

  const lines = [
    `Top artists: ${profile.topArtists.join(", ") || "none"}`,
    `Top genres: ${profile.topGenres.join(", ") || "none"}`,
    `Sample tracks the user listens to: ${profile.sampleTracks
      .map((t) => `"${t.title}" by ${t.artist}`)
      .join("; ") || "none"}`,
  ];

  return lines.join("\n");
}
