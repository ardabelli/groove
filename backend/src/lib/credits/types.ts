export const FREE_CREDITS = 2;
export const AD_REWARD_CREDITS = 1;
export const AD_MIN_WATCH_SECONDS = 15;

export type CreditsErrorCode = "unauthenticated" | "unknown";

export type CreditsResult =
  | { ok: true; data: { credits: number } }
  | { ok: false; error: CreditsErrorCode; message?: string };

export type AdStartErrorCode = "unauthenticated" | "unknown";

export type AdStartResult =
  | { ok: true; data: { token: string; minWatchSeconds: number } }
  | { ok: false; error: AdStartErrorCode; message?: string };

export type AdCompleteErrorCode = "unauthenticated" | "invalid_token" | "unknown";

export type AdCompleteResult =
  | { ok: true; data: { credits: number; creditsAwarded: number } }
  | { ok: false; error: AdCompleteErrorCode; message?: string };
