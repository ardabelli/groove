import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

export const SESSION_COOKIE_NAME = "groove_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface SessionPayload {
  userId: string;
  displayName: string | null;
  imageUrl: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

// In production the frontend and backend live on different domains, so the cookie
// must be SameSite=None (which browsers only honor when Secure is also set); locally
// over plain http://127.0.0.1 that combination is rejected, so lax/insecure stays for dev.
const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true as const,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  secure: isProduction,
  path: "/",
};

export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function signSessionCookie(res: Response, payload: SessionPayload) {
  res.cookie(SESSION_COOKIE_NAME, createSessionToken(payload), {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: cookieOptions.path });
}

function readSessionPayload(req: Request): SessionPayload | null {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

async function refreshSpotifyAccessToken(refreshToken: string) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.AUTH_SPOTIFY_ID}:${process.env.AUTH_SPOTIFY_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Spotify access token");
  }

  return (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
}

export class AuthError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Verifies the session cookie, refreshing the Spotify access token if it's
 * near expiry, and re-issuing the cookie on `res` when refreshed. Throws
 * AuthError if there's no valid session.
 */
export async function getAuthContext(req: Request, res: Response) {
  const payload = readSessionPayload(req);
  if (!payload) {
    throw new AuthError();
  }

  if (Date.now() < payload.expiresAt - 60_000) {
    return { userId: payload.userId, accessToken: payload.accessToken };
  }

  try {
    const refreshed = await refreshSpotifyAccessToken(payload.refreshToken);
    const updated: SessionPayload = {
      ...payload,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? payload.refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    };
    signSessionCookie(res, updated);
    return { userId: updated.userId, accessToken: updated.accessToken };
  } catch {
    clearSessionCookie(res);
    throw new AuthError();
  }
}

export function getSessionUser(req: Request) {
  const payload = readSessionPayload(req);
  if (!payload) return null;
  return {
    id: payload.userId,
    displayName: payload.displayName,
    imageUrl: payload.imageUrl,
  };
}

export type { SessionPayload };
