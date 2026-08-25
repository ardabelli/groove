import type { AdCompleteResult, AdStartResult, CreditsResult } from "./types";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

export interface MeResponse {
  authenticated: boolean;
  user?: {
    id: string;
    displayName: string | null;
    imageUrl: string | null;
    credits: number;
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

export async function fetchCredits(): Promise<CreditsResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/credits`, { credentials: "include" });
    return (await res.json()) as CreditsResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export async function startAdReward(): Promise<AdStartResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/credits/ad/start`, {
      method: "POST",
      credentials: "include",
    });
    return (await res.json()) as AdStartResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export async function completeAdReward(token: string): Promise<AdCompleteResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/credits/ad/complete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    return (await res.json()) as AdCompleteResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}
