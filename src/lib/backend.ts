export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

export interface MeResponse {
  authenticated: boolean;
  user?: {
    id: string;
    displayName: string | null;
    imageUrl: string | null;
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
