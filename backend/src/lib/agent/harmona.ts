import { randomUUID } from "node:crypto";

const DEFAULT_BASE_URL = "https://api.harmona.ai";
const REQUEST_TIMEOUT_MS = 90_000;

/**
 * Calls a Harmona agent's B2C chat endpoint and returns the full assistant reply.
 *
 * Harmona streams the answer as Server-Sent Events; we accumulate the
 * `on_chat_model_stream` chunks and return the concatenated text. Each call uses a
 * fresh `external_user_id` so there's no conversation carry-over between curations
 * (the curator is stateless — every request is self-contained).
 */
export async function requestHarmonaCompletion(message: string): Promise<string> {
  const apiKey = process.env.HARMONA_API_KEY;
  if (!apiKey) throw new Error("HARMONA_API_KEY is not set");

  const baseUrl = (process.env.AI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const userPrefix = process.env.HARMONA_USER_ID ?? "groove-curator";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/b2c/v1/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_user_id: `${userPrefix}-${randomUUID()}`,
        message,
      }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Harmona request failed: ${res.status} ${detail}`.trim());
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let out = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload);
          if (event.event === "on_chat_model_stream") {
            out += event.data?.chunk?.content ?? "";
          }
        } catch {
          // keep-alive / non-JSON lines — ignore
        }
      }
    }

    if (!out.trim()) throw new Error("Harmona returned an empty response");
    return out;
  } finally {
    clearTimeout(timeout);
  }
}
