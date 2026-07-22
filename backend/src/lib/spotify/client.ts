
import { SpotifyApiError, SpotifyAuthError, SpotifyRateLimitError } from "./errors";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export async function spotifyFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T | undefined> {
  const res = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    throw new SpotifyAuthError();
  }

  if (res.status === 429) {
    const retryAfterSeconds = Number(res.headers.get("Retry-After") ?? "1");
    throw new SpotifyRateLimitError(retryAfterSeconds);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    console.error("[spotifyFetch]", res.status, path, JSON.stringify(body));
    throw new SpotifyApiError(
      res.status,
      body?.error?.message ?? `Spotify API request failed (${res.status})`
    );
  }

  if (res.status === 204) {
    return undefined;
  }

  return (await res.json()) as T;
}
