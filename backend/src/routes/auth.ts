import { Router } from "express";
import { getMe } from "../lib/spotify/profile";
import { getUserById, upsertUser } from "../db/users";
import {
  clearSessionCookie,
  createSessionToken,
  getSessionUser,
  SESSION_MAX_AGE_SECONDS,
  type SessionPayload,
} from "../lib/session";

const SPOTIFY_SCOPES = [
  "user-top-read",
  "user-read-email",
  "playlist-modify-private",
  "playlist-modify-public",
].join(" ");

function redirectUri() {
  return process.env.SPOTIFY_REDIRECT_URI!;
}

function encodeState(vibe: string | undefined) {
  return Buffer.from(JSON.stringify({ vibe: vibe ?? "" })).toString("base64url");
}

export const authRouter = Router();

authRouter.get("/login", (req, res) => {
  const vibe = typeof req.query.vibe === "string" ? req.query.vibe : undefined;

  const params = new URLSearchParams({
    client_id: process.env.AUTH_SPOTIFY_ID!,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SPOTIFY_SCOPES,
    state: encodeState(vibe),
    show_dialog: "true",
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

/**
 * Exchanges a Spotify authorization code for a signed session token.
 *
 * Called server-to-server by the frontend's /api/auth/callback route handler,
 * which then sets the `groove_session` cookie itself — first-party, and without
 * depending on a Set-Cookie header surviving the /api/* proxy hop (it doesn't,
 * reliably, on Next 16 / Vercel, which is why login never stuck).
 *
 * `redirectUri` must be exactly the value the frontend used when sending the
 * user to Spotify, since Spotify validates it again on the token exchange.
 */
authRouter.post("/exchange", async (req, res) => {
  const code = typeof req.body?.code === "string" ? req.body.code : null;
  const redirect = typeof req.body?.redirectUri === "string" ? req.body.redirectUri : redirectUri();

  if (!code) {
    res.status(400).json({ ok: false });
    return;
  }

  try {
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.AUTH_SPOTIFY_ID}:${process.env.AUTH_SPOTIFY_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirect,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Spotify token exchange failed");
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const profile = await getMe(tokens.access_token);

    await upsertUser({
      id: profile.id,
      email: profile.email ?? null,
      displayName: profile.display_name,
      imageUrl: profile.images?.[0]?.url ?? null,
    });

    const payload: SessionPayload = {
      userId: profile.id,
      displayName: profile.display_name,
      imageUrl: profile.images?.[0]?.url ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };

    res.json({
      ok: true,
      token: createSessionToken(payload),
      maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
    });
  } catch (err) {
    console.error("[auth/exchange]", err);
    res.status(502).json({ ok: false });
  }
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.json({ authenticated: false });
    return;
  }

  const dbUser = await getUserById(user.id);
  res.json({
    authenticated: true,
    user: { ...user, credits: dbUser?.credits ?? 0, isAdmin: dbUser?.isAdmin ?? false },
  });
});
