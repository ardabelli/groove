import { NextResponse } from "next/server";

// Clears the session cookie first-party. Like the callback route, this doesn't
// rely on a Set-Cookie surviving the /api/* proxy hop, so sign-out is reliable.

const SESSION_COOKIE_NAME = "groove_session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
