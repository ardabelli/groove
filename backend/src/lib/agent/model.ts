import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { CuratorResponseSchema } from "./schema";
import { requestHarmonaCompletion } from "./harmona";

/**
 * Runs one curator turn and returns the model's raw response text (expected to be
 * a JSON object matching CuratorResponseSchema — the caller parses and validates).
 */
export type CuratorGenerateFn = (system: string, prompt: string) => Promise<string>;

/**
 * Resolves the curator backend from env, so swapping providers or models is a
 * config change rather than a code change:
 *
 *   AI_PROVIDER       "openai" (default) | "harmona"
 *   AI_MODEL          model id — openai only, default "gpt-4o"
 *   OPENAI_API_KEY    credentials for the "openai" provider
 *   HARMONA_API_KEY   agent key (hapi_...) for the "harmona" provider
 *   AI_BASE_URL       override the provider base URL (both providers)
 *
 * To add a provider: give it a `case` that returns a CuratorGenerateFn.
 */
export function resolveCuratorGenerate(): CuratorGenerateFn {
  const provider = process.env.AI_PROVIDER ?? "openai";

  switch (provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.AI_BASE_URL,
      });
      const model = openai(process.env.AI_MODEL ?? "gpt-4o");
      return async (system, prompt) => {
        const result = await generateText({
          model,
          system,
          prompt,
          output: Output.object({ schema: CuratorResponseSchema }),
        });
        if (!result.output) throw new Error("No structured response returned");
        return JSON.stringify(result.output);
      };
    }

    // Harmona has no OpenAI-compatible endpoint: it's a single SSE chat endpoint
    // (POST /b2c/v1/chat) against a pre-configured agent. The agent must be set up
    // in the Harmona dashboard to emit the JSON this curator expects; the system
    // and user prompts are concatenated into one message.
    case "harmona":
      return (system, prompt) => requestHarmonaCompletion(`${system}\n\n${prompt}`);

    default:
      throw new Error(
        `Unsupported AI_PROVIDER "${provider}" — add a case in backend/src/lib/agent/model.ts`
      );
  }
}
