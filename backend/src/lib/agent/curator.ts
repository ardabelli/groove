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

Curation rules:
- Vibe fit is the primary selection criterion, ahead of the user's taste profile. Lean into the stated vibe even where it pulls away from the user's usual listening — the taste profile should shape the specific picks within the vibe (which artists, which sub-genre), not override it. E.g. an "80s Miami" vibe calls for synthwave-era sounds even if the user's taste profile skews elsewhere; a "hardcore techno festival" vibe calls for actual hardcore techno tracks.
- Never put two versions of the same song in one playlist. Remasters, remixes, remakes, live recordings, acoustic versions, radio/extended edits, and any other alternate cut of the same underlying song count as the same song — pick one version. Also avoid picking two different songs that merely share a title if one is really a re-recording/alternate version of the other.
- The final playlist must have at least 8 tracks. Because some search queries won't land a match and some results get deduplicated (same song, different version), always provide 8-12 search_queries, each targeting a distinct real song, so at least 8 unique tracks survive.

Given the user's taste profile and vibe, respond with:
- curator_note: a short, natural-language explanation of the flow you designed (why these queries, in this order).
- playlist_title: a short, catchy title inspired by the vibe — NOT the raw vibe text copied verbatim. Distill it into a real title, under 60 characters, in the same language the user wrote the vibe in. E.g. for the vibe "eski sevgilimden ayrıldım, onu düşünmemi sağlayacak şarkılar" a good title is "Ayrıldıktan Sonra Dinlenecek Şarkılar", not the user's literal sentence.
- playlist_description: a warm, 1-2 sentence, second-person description for Spotify's playlist description field, written for the listener (not DJ reasoning like curator_note) and in the same language as the vibe — e.g. "Ayrıldığında dinleyeceğin, sana özel seçkilerle dolu bu playlist Groove tarafından hazırlandı." Mention Groove as the curator.
- search_queries: 8-12 specific Spotify search strings (e.g. "artist:Bonobo track:Kong", or genre/mood queries), ordered deliberately to form a set arc as described by ordering_intent. This order is the actual playback order, so sequence it with intent (e.g. open mellow, build gradually, avoid abrupt tempo/energy jumps).
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
