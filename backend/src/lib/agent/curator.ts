import { resolveCuratorGenerate } from "./model";
import { CuratorResponseSchema, type CuratorResponse } from "./schema";
import { formatTasteProfileForPrompt, type EmptyTasteProfile, type TasteProfile } from "./taste-profile";

const generate = resolveCuratorGenerate();

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
- Decide the exact \`tracks\` list first — it is the single source of truth. Every other field (curator_note, mood_parameters) describes THAT exact list, not a different imagined one. Never mention, reference, or imply a song in curator_note that isn't actually in \`tracks\`.
- The final playlist must have at least 8 tracks, so always provide 8-12 entries in \`tracks\`, each a distinct real song by a real artist — use the exact primary artist name and song title as they'd appear on Spotify, since these are used to look the song up directly.

Given the user's taste profile and vibe, respond with:
- tracks: 8-12 distinct real songs as {"artist": ..., "title": ...} objects, ordered deliberately to form a set arc as described by ordering_intent. This order is the actual playback order, so sequence it with intent (e.g. open mellow, build gradually, avoid abrupt tempo/energy jumps).
- curator_note: a short, natural-language explanation of the flow you designed (why these tracks, in this order). Only ever refer to songs that are actually in \`tracks\`.
- playlist_title: a short, catchy title inspired by the vibe — NOT the raw vibe text copied verbatim. Distill it into a real title, under 60 characters, in the same language the user wrote the vibe in. E.g. for the vibe "eski sevgilimden ayrıldım, onu düşünmemi sağlayacak şarkılar" a good title is "Ayrıldıktan Sonra Dinlenecek Şarkılar", not the user's literal sentence.
- playlist_description: a warm, 1-2 sentence, second-person description for Spotify's playlist description field, written for the listener (not DJ reasoning like curator_note) and in the same language as the vibe — e.g. "Ayrıldığında dinleyeceğin, sana özel seçkilerle dolu bu playlist Groove tarafından hazırlandı." Mention Groove as the curator.
- mood_parameters: energy level, a few descriptors, and an ordering_intent string describing the arc.

OUTPUT FORMAT: Respond with a single raw JSON object and nothing else — no prose, no explanation, no markdown code fences. It must match this shape exactly:
{
  "tracks": [{ "artist": "string", "title": "string" }],
  "curator_note": "string",
  "playlist_title": "string",
  "playlist_description": "string",
  "mood_parameters": {
    "energy": "low" | "medium" | "high",
    "descriptors": ["string"],
    "ordering_intent": "string"
  }
}
"tracks" must have 8-12 entries; "mood_parameters.descriptors" at most 6.`;

function buildUserPrompt(vibe: string, tasteProfile: TasteProfile | EmptyTasteProfile): string {
  return `User's vibe request: "${vibe}"\n\n${formatTasteProfileForPrompt(tasteProfile)}`;
}

/** Pulls the JSON object out of a model reply that may be fenced or wrapped in prose. */
function parseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new AgentError("Model response did not contain a JSON object");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

async function requestCuratorResponse(
  vibe: string,
  tasteProfile: TasteProfile | EmptyTasteProfile,
  retryContext?: string
): Promise<CuratorResponse> {
  const prompt = retryContext
    ? `${buildUserPrompt(vibe, tasteProfile)}\n\n${retryContext}`
    : buildUserPrompt(vibe, tasteProfile);

  const text = await generate(SYSTEM_PROMPT, prompt);
  return CuratorResponseSchema.parse(parseJsonObject(text));
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
