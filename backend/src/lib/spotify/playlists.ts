
import { spotifyFetch } from "./client";
import type { SpotifyPlaylist } from "./types";

const ADD_TRACKS_CHUNK_SIZE = 100;

export async function createPlaylist(
  accessToken: string,
  { name, description, public: isPublic = false }: { name: string; description: string; public?: boolean }
): Promise<SpotifyPlaylist> {
  const playlist = await spotifyFetch<SpotifyPlaylist>(
    `/me/playlists`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ name, description, public: isPublic }),
    }
  );

  if (!playlist) {
    throw new Error("Failed to create Spotify playlist");
  }

  return playlist;
}

export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  uris: string[]
): Promise<void> {
  for (let i = 0; i < uris.length; i += ADD_TRACKS_CHUNK_SIZE) {
    const chunk = uris.slice(i, i + ADD_TRACKS_CHUNK_SIZE);
    await spotifyFetch(`/playlists/${playlistId}/items`, accessToken, {
      method: "POST",
      body: JSON.stringify({ uris: chunk }),
    });
  }
}
