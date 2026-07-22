import { Router } from "express";
import { getMe } from "../lib/spotify/profile";
import { upsertUser } from "../db/users";
import {
  clearSessionCookie,
  getSessionUser,
  signSessionCookie,
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

function decodeState(state: string | undefined): { vibe: string } {
  if (!state) return { vibe: "" };
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
  } catch {
    return { vibe: "" };
  }
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

authRouter.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;
  const { vibe } = decodeState(typeof state === "string" ? state : undefined);
  const frontendUrl = process.env.FRONTEND_URL!;

  if (error || typeof code !== "string") {
    res.redirect(`${frontendUrl}/?authError=1`);
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
        redirect_uri: redirectUri(),
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
    signSessionCookie(res, payload);

    const redirectUrl = vibe ? `${frontendUrl}/?vibe=${encodeURIComponent(vibe)}` : `${frontendUrl}/`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("[auth/callback]", err);
    res.redirect(`${frontendUrl}/?authError=1`);
  }
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user });
});
