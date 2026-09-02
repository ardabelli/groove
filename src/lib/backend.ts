// Empty on purpose: /api/* is proxied to the Express backend via the rewrite in
// next.config.ts, so every call in this file (and every direct backend link
// elsewhere, e.g. the Spotify sign-in button) stays same-origin. That keeps the
// backend's session cookie first-party from the browser's point of view — a
// cross-origin cookie is blocked by Safari always, and by Chrome increasingly.
export const BACKEND_URL = "";

export interface MeResponse {
  authenticated: boolean;
  user?: {
    id: string;
    displayName: string | null;
    imageUrl: string | null;
    isAdmin: boolean;
  };
}

export async function fetchMe(): Promise<MeResponse> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: "include" });
    return (await res.json()) as MeResponse;
  } catch {
    return { authenticated: false };
  }
}
