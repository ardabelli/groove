
import { spotifyFetch } from "./client";
import type { SpotifyProfile } from "./types";

export async function getMe(accessToken: string): Promise<SpotifyProfile> {
  const profile = await spotifyFetch<SpotifyProfile>("/me", accessToken);
  if (!profile) {
    throw new Error("Failed to fetch Spotify profile");
  }
  return profile;
}
