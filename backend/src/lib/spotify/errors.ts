
export class SpotifyAuthError extends Error {
  constructor(message = "Spotify access token is invalid or expired") {
    super(message);
    this.name = "SpotifyAuthError";
  }
}

export class SpotifyRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Spotify rate limited, retry after ${retryAfterSeconds}s`);
    this.name = "SpotifyRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class SpotifyApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
  }
}
