import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Resolves the language model the curator agent runs on from env, so swapping
 * providers or models is a config change rather than a code change:
 *
 *   AI_PROVIDER      provider id — defaults to "openai"
 *   AI_MODEL         model id for that provider — defaults per-provider below
 *   OPENAI_API_KEY   credentials for the "openai" provider
 *
 * To add a provider: install its `@ai-sdk/<name>` package and add a `case` here.
 */
export function resolveCuratorModel(): LanguageModel {
  const provider = process.env.AI_PROVIDER ?? "openai";

  switch (provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return openai(process.env.AI_MODEL ?? "gpt-4o");
    }
    default:
      throw new Error(
        `Unsupported AI_PROVIDER "${provider}" — add a case in backend/src/lib/agent/model.ts`
      );
  }
}
