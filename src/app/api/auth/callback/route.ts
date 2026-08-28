import { NextResponse, type NextRequest } from "next/server";

// Spotify redirects the browser here after the user authorizes. This route runs
// on the frontend's own origin, so the session cookie it sets is first-party and
// doesn't depend on a Set-Cookie header surviving the /api/* proxy hop to the
// Express backend (it doesn't, reliably, on Next 16 / Vercel — that's the bug
// where login never stuck).
//
// The backend still owns the Spotify token exchange, the DB upsert and the JWT
// signing; we just POST the code to it and set the cookie it hands back.

const BACKEND_ORIGIN = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";
const SESSION_COOKIE_NAME = "groove_session";

function decodeVibe(state: string | null): string {
  if (!state) return "";
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    return typeof parsed?.vibe === "string" ? parsed.vibe : "";
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const vibe = decodeVibe(searchParams.get("state"));

  // Build the origin from the Host header rather than req.nextUrl (which, in dev,
  // pins to the server's bound hostname). This must resolve to exactly the URI
  // configured as SPOTIFY_REDIRECT_URI on the backend, since Spotify re-validates
  // it during the token exchange.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const origin = `${proto}://${host}`;

  const fail = () => NextResponse.redirect(new URL("/?authError=1", origin));
  if (error || !code) return fail();

  let payload: { ok?: boolean; token?: string; maxAgeSeconds?: number };
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/api/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri: `${origin}/api/auth/callback` }),
    });
    payload = await res.json();
  } catch {
    return fail();
  }

  if (!payload?.ok || !payload.token) return fail();

  const dest = vibe ? `/?vibe=${encodeURIComponent(vibe)}` : "/";
  const response = NextResponse.redirect(new URL(dest, origin));
  response.cookies.set(SESSION_COOKIE_NAME, payload.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: payload.maxAgeSeconds ?? 30 * 24 * 60 * 60,
  });
  return response;
}
