import { generateText, Output } from "ai";
import { groq } from "@ai-sdk/groq";
import { CuratorResponseSchema, type CuratorResponse } from "./schema";
import { formatTasteProfileForPrompt, type EmptyTasteProfile, type TasteProfile } from "./taste-profile";

const MODEL = groq("openai/gpt-oss-120b");

export class AgentError extends Error {
  constructor(message = "The curator agent failed to produce a valid response") {
    super(message);
    this.name = "AgentError";
  }
}

const SYSTEM_PROMPT = `You are Groove, an AI DJ Agent. You curate Spotify playlists by reasoning about music the way a skilled DJ would: tempo, energy, genre compatibility, and the arc of a set.

You do NOT have access to Spotify's audio-features, audio-analysis, or recommendations APIs. You must rely entirely on your own knowledge of real songs, artists, and genres, combined with the user's taste profile and stated vibe.

Given the user's taste profile and vibe, respond with:
- curator_note: a short, natural-language explanation of the flow you designed (why these queries, in this order).
- search_queries: 3-8 specific Spotify search strings (e.g. "artist:Bonobo track:Kong", or genre/mood queries), ordered deliberately to form a set arc as described by ordering_intent. This order is the actual playback order, so sequence it with intent (e.g. open mellow, build gradually, avoid abrupt tempo/energy jumps).
- mood_parameters: energy level, a few descriptors, and an ordering_intent string describing the arc.`;

function buildUserPrompt(vibe: string, tasteProfile: TasteProfile | EmptyTasteProfile): string {
  return `User's vibe request: "${vibe}"\n\n${formatTasteProfileForPrompt(tasteProfile)}`;
}

async function requestCuratorResponse(
  vibe: string,
  tasteProfile: TasteProfile | EmptyTasteProfile,
  retryContext?: string
): Promise<CuratorResponse> {
  const prompt = retryContext
    ? `${buildUserPrompt(vibe, tasteProfile)}\n\n${retryContext}`
    : buildUserPrompt(vibe, tasteProfile);

  const result = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt,
    output: Output.object({ schema: CuratorResponseSchema }),
  });

  if (!result.output) {
    throw new AgentError("No structured response returned");
  }

  return result.output;
}

export async function runCurator({
  vibe,
  tasteProfile,
}: {
  vibe: string;
  tasteProfile: TasteProfile | EmptyTasteProfile;
}): Promise<CuratorResponse> {
  try {
    return await requestCuratorResponse(vibe, tasteProfile);
  } catch (firstError) {
    try {
      return await requestCuratorResponse(
        vibe,
        tasteProfile,
        `Your previous response was invalid: ${
          firstError instanceof Error ? firstError.message : "unknown error"
        }. Please respond again, strictly matching the required schema.`
      );
    } catch (secondError) {
      throw new AgentError(
        secondError instanceof Error ? secondError.message : "Agent failed twice"
      );
    }
  }
}
