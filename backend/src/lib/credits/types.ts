export const FREE_CREDITS = 2;

export type CreditsErrorCode = "unauthenticated" | "unknown";

export type CreditsResult =
  | { ok: true; data: { credits: number } }
  | { ok: false; error: CreditsErrorCode; message?: string };
