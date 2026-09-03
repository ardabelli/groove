import { randomUUID } from "node:crypto";

const DEFAULT_BASE_URL = "https://api.platform.harmona.ai";
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Calls a Harmona agent's B2C chat endpoint and returns the agent's final reply.
 *
 * The endpoint (`POST /b2c/v1/chat`) streams a LangGraph event log as SSE. We
 * don't concatenate the `on_chat_model_stream` token deltas — those also carry
 * Harmona's internal guardrail pass (a `{"violation": ...}` JSON blob). Instead we
 * track the last `type: "ai"` message that appears in any event's
 * `data.output.messages`, which is the clean user-facing answer.
 *
 * Each call uses a fresh `external_user_id` so there's no conversation carry-over
 * between curations (the curator is stateless — every request is self-contained).
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
        messages: [{ role: "user", content: message }],
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
    let answer = "";

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

        let event: unknown;
        try {
          event = JSON.parse(payload);
        } catch {
          continue; // keep-alive / partial line
        }

        const messages = (event as { data?: { output?: { messages?: unknown } } })?.data?.output
          ?.messages;
        if (!Array.isArray(messages)) continue;

        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i] as { type?: string; content?: unknown };
          if (m?.type === "ai" && typeof m.content === "string" && m.content.trim()) {
            answer = m.content;
            break;
          }
        }
      }
    }

    if (!answer.trim()) throw new Error("Harmona returned no assistant message");
    return answer;
  } finally {
    clearTimeout(timeout);
  }
}
