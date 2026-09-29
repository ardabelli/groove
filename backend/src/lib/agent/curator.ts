import { z } from "zod";
import { resolveCuratorGenerate } from "./model";
import { CuratorResponseSchema, type CuratorResponse, type TrackSelection } from "./schema";
import { normalizeForCompare, titlesLikelyMatch } from "./build-tracklist";
import { formatTasteProfileForPrompt, type EmptyTasteProfile, type TasteProfile } from "./taste-profile";

const generate = resolveCuratorGenerate();

export class AgentError extends Error {
  constructor(message = "The curator agent failed to produce a valid response") {
    super(message);
    this.name = "AgentError";
  }
}

/** A model reply that failed parsing or validation; keeps the reply so a retry can fix it. */
class InvalidResponseError extends AgentError {
  constructor(
    readonly reason: string,
    readonly responseText: string
  ) {
    const snippet = responseText.slice(0, 300).replace(/\s+/g, " ").trim();
    super(`${reason} — model returned: ${snippet || "(empty)"}`);
  }
}

const CURATOR_NOTE_RULES = `CURATOR NOTE: curator_note is you, the DJ who just built this set, walking the listener through it in the first person. Follow the format of the examples below exactly:
- One flowing paragraph that goes through the tracks in playback order, from the opener to the closer.
- Name EVERY track exactly once: by its artist, preferably together with the song title in double quotes (e.g. Frank Ocean’s "Ivy"), each with a short evocative touch about what it brings to the set. If an artist has more than one track, mention each of those tracks separately — by its title, or by naming the artist again. Group 2-3 tracks per sentence and link them with transitions that trace the arc (opening, deepening, building, peaking, closing).
- Double quotes are only for song titles. Never name a song or an artist that isn't in the tracklist.
- No greeting, no sign-off, no sentence that isn't about the tracks.
- Speak as yourself, in the first person and past tense, about choices you made ("I opened with...", "then I built it up with..."; Turkish: "başladım", "yükselttim", "bitirdim"). Never describe the set in the future tense or talk about what the listener will feel. If you address the listener, use the informal form (Turkish: "sen", never "siz").
- Write it in the vibe's language, in natural wording that doesn't read like a translation. In Turkish, don't glue a suffix onto a closing quote (not "Git"i or "The Blower's Daughter"'ı) — follow the title with a word such as parçası, şarkısı or ile instead. Under 900 characters.

The two examples below show the FORMAT and VOICE only. Their songs were picked for other vibes: choose your tracks for this vibe on their own merits and don't reuse songs or artists from the examples just because they appear here.

English vibe example:
"I opened with Frank Ocean’s tender "Ivy" to set a quiet, autumnal mood, then deepened the rain‑kissed atmosphere with Joji’s "Slow Dancing in the Dark" and Burial’s iconic "Archangel." Drake’s "Marvins Room" adds a hushed hip‑hop confession, followed by Brent Faiyaz’s soothing "Gravity" and Kanye West’s reflective "Street Lights." The set brightens just a touch with Travis Scott’s laid‑back "Coffee Bean," then drifts into Deftones’ dreamy "Digital Bath" before closing on Yebba’s emotive "Far Away (feat. A$AP Rocky)" to leave the night lingering."

Turkish vibe example:
"Bu set, Pink Floyd’un kozmik açılışıyla başlayıp, Doors’un yağmurlu atmosferiyle devam eder. Erkin Koray ve Barış Manço’nun 70’ler Türk psikedelik dokunuşları orta tempoya geçiş yapar. Funkadelic ve Hawkwind uzay sesleriyle enerjiyi yükseltir, ardından Blue Öyster Cult, Deep Purple ve Led Zeppelin ile doruk noktasına ulaşır; The Stooges’in ham patlamasıyla bitirerek yüksek enerjiyi korur."`;

const SYSTEM_PROMPT = `You are Groove, an AI DJ Agent. You curate Spotify playlists by reasoning about music the way a skilled DJ would: tempo, energy, genre compatibility, and the arc of a set.

You do NOT have access to Spotify's audio-features, audio-analysis, or recommendations APIs. You must rely entirely on your own knowledge of real songs, artists, and genres, combined with the user's taste profile and stated vibe.

Curation rules:
- Vibe fit is the primary selection criterion, ahead of the user's taste profile. Lean into the stated vibe even where it pulls away from the user's usual listening — the taste profile should shape the specific picks within the vibe (which artists, which sub-genre), not override it. E.g. an "80s Miami" vibe calls for synthwave-era sounds even if the user's taste profile skews elsewhere; a "hardcore techno festival" vibe calls for actual hardcore techno tracks.
- Never put two versions of the same song in one playlist. Remasters, remixes, remakes, live recordings, acoustic versions, radio/extended edits, and any other alternate cut of the same underlying song count as the same song — pick one version. Also avoid picking two different songs that merely share a title if one is really a re-recording/alternate version of the other.
- Decide the exact \`tracks\` list first — it is the single source of truth. Every other field (curator_note, mood_parameters) describes THAT exact list, not a different imagined one. curator_note and \`tracks\` must match one-to-one: every track in \`tracks\` is named in curator_note, and every song named in curator_note is in \`tracks\`.
- Language: playlist_title, playlist_description and curator_note are shown to the listener, so write all three in the language the vibe is written in — a Turkish vibe gets Turkish text, an English vibe gets English text, and so on. These instructions and some examples below are in English or Turkish only for illustration; they never decide the output language, the vibe does.
- The final playlist must have at least 8 tracks, so always provide 8-12 entries in \`tracks\`, each a distinct real song by a real artist — use the exact primary artist name and song title as they'd appear on Spotify, since these are used to look the song up directly.

Given the user's taste profile and vibe, respond with:
- tracks: 8-12 distinct real songs as {"artist": ..., "title": ...} objects, ordered deliberately to form a set arc as described by ordering_intent. This order is the actual playback order, so sequence it with intent (e.g. open mellow, build gradually, avoid abrupt tempo/energy jumps).
- curator_note: see CURATOR NOTE below.
- playlist_title: a short, catchy title inspired by the vibe — NOT the raw vibe text copied verbatim. Distill it into a real title, under 60 characters, in the same language the user wrote the vibe in. E.g. for the vibe "eski sevgilimden ayrıldım, onu düşünmemi sağlayacak şarkılar" a good title is "Ayrıldıktan Sonra Dinlenecek Şarkılar", not the user's literal sentence.
- playlist_description: a warm, 1-2 sentence, second-person description for Spotify's playlist description field, written for the listener (not DJ reasoning like curator_note) and in the same language as the vibe — e.g. "Ayrıldığında dinleyeceğin, sana özel seçkilerle dolu bu playlist Groove tarafından hazırlandı." Mention Groove as the curator.
- mood_parameters: energy level, a few descriptors, and an ordering_intent string describing the arc.

${CURATOR_NOTE_RULES}

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

// How far (in words) an artist name can sit from a quoted title and still be read
// as naming that same track: `Kanye West's reflective "Street Lights"` (before)
// or `"Get You" by Daniel Caesar` (after).
const ARTIST_BEFORE_TITLE_WINDOW = 4;
const ARTIST_AFTER_TITLE_WINDOW = 3;

function artistWords(artist: string): string[] {
  return normalizeForCompare(artist).replace(/^the /, "").split(" ").filter(Boolean);
}

/**
 * Checks that the note gives every track its own mention, in the same order as
 * the tracklist, and quotes no song outside the tracklist. A track is mentioned by its quoted title or by its
 * artist's name, and each artist mention covers only one track: an artist with
 * two tracks has to be accounted for twice (two titles, or a title plus a
 * separate mention of the artist, or the artist named twice). Throws with the
 * specific mismatch so the retry prompt can tell the model exactly what to fix;
 * `canAddTracks` says whether a song quoted only in the note may be fixed by
 * adding it to the tracklist, or only by dropping it from the note.
 */
function assertNoteMatchesTracks(
  note: string,
  tracks: TrackSelection[],
  { canAddTracks }: { canAddTracks: boolean }
): void {
  // Swap each quoted span for a placeholder word, so quoted titles (which may
  // contain artist names, e.g. "feat. Kali Uchis") don't count as artist mentions
  // and we know where each title sits among the words.
  const quoted: string[] = [];
  const withPlaceholders = note.replace(/["“”]([^"“”]+)["“”]/g, (_, title: string) => {
    quoted.push(title.trim());
    return ` qqq${quoted.length - 1}qqq `;
  });
  const words = normalizeForCompare(withPlaceholders).split(" ");

  // Every place an artist's name appears in the note, outside quotes.
  type ArtistMention = { artist: string; start: number; end: number; used: boolean };
  const mentions: ArtistMention[] = [];
  for (const artist of new Set(tracks.map((t) => artistWords(t.artist).join(" ")))) {
    const n = artist.split(" ").length;
    for (let i = 0; i + n <= words.length; i++) {
      if (artist && words.slice(i, i + n).join(" ") === artist) {
        mentions.push({ artist, start: i, end: i + n, used: false });
      }
    }
  }

  // Each mentioned track, with the word position of its mention in the note.
  const mentioned = new Map<TrackSelection, number>();
  const extra: string[] = [];

  // Quoted titles: each one names one track, and claims the artist mention
  // right next to it (if any) so that mention can't also cover another track.
  quoted.forEach((title, i) => {
    const matching = tracks.filter((t) => titlesLikelyMatch(t.title, title));
    if (matching.length === 0) {
      extra.push(title);
      return;
    }
    const position = words.indexOf(`qqq${i}qqq`);
    const nearbyMention = (track: TrackSelection) =>
      mentions
        .filter(
          (m) =>
            !m.used &&
            m.artist === artistWords(track.artist).join(" ") &&
            ((m.end <= position && position - m.end < ARTIST_BEFORE_TITLE_WINDOW) ||
              (m.start > position && m.start - position <= ARTIST_AFTER_TITLE_WINDOW))
        )
        .sort((a, b) => Math.abs(a.start - position) - Math.abs(b.start - position))[0];
    const unclaimed = matching.filter((t) => !mentioned.has(t));
    const track = unclaimed.find((t) => nearbyMention(t)) ?? unclaimed[0];
    if (!track) return; // same title quoted twice
    mentioned.set(track, position);
    const mention = nearbyMention(track);
    if (mention) mention.used = true;
  });

  // Tracks not named by title each need a separate, unclaimed artist mention.
  for (const track of tracks) {
    if (mentioned.has(track)) continue;
    const mention = mentions.find(
      (m) => !m.used && m.artist === artistWords(track.artist).join(" ")
    );
    if (!mention) continue;
    mention.used = true;
    mentioned.set(track, mention.start);
  }

  const missing = tracks.filter((t) => !mentioned.has(t));
  const inTracksOrder = tracks.filter((t) => mentioned.has(t));
  const inNoteOrder = [...inTracksOrder].sort((a, b) => mentioned.get(a)! - mentioned.get(b)!);
  const outOfOrder = inNoteOrder.some((t, i) => t !== inTracksOrder[i]);
  if (missing.length === 0 && extra.length === 0 && !outOfOrder) return;

  const listTracks = (list: TrackSelection[]) =>
    list.map((t, i) => `${i + 1}. ${t.artist} - "${t.title}"`).join(", ");

  const problems = [
    missing.length > 0 &&
      `curator_note does not mention these tracks: ${missing
        .map((t) => `${t.artist} - "${t.title}"`)
        .join(", ")} (every track needs its own mention; if an artist has more than one track, mention each of them separately, by its title in double quotes or by naming the artist again)`,
    extra.length > 0 &&
      `curator_note quotes songs that are not in tracks: ${extra.map((q) => `"${q}"`).join(", ")} (${
        canAddTracks
          ? "for each one, prefer adding it to tracks at the spot the note describes; only remove it from curator_note instead if it isn't a real song, doesn't fit the vibe, is another version of a song already in tracks, or tracks already has 12 entries"
          : "the tracklist is final, so remove them from curator_note"
      })`,
    outOfOrder &&
      `curator_note goes through the tracks in a different order than tracks. Order in curator_note: ${listTracks(
        inNoteOrder
      )}. Order in tracks: ${listTracks(inTracksOrder)}. ${
        canAddTracks
          ? "tracks is the playback order and curator_note must walk through it in exactly that order: reorder tracks to match the note if the note's arc is the one you intended, otherwise rewrite the note to follow tracks"
          : "The tracklist order is final, so rewrite curator_note to go through the tracks in exactly the tracks order"
      }`,
  ].filter(Boolean);
  throw new AgentError(problems.join("; "));
}

const MAX_ATTEMPTS = 3;

// The model has no memory between calls, so hand its previous reply back:
// otherwise it starts a fresh set instead of fixing the one it wrote.
function retryContextFor(error: unknown): string {
  if (error instanceof InvalidResponseError) {
    return `Your previous response was invalid: ${error.reason}

Your previous response:
${error.responseText}

Fix those problems in that response and send the full corrected JSON object again, strictly matching the required schema. Keep everything that was already valid.`;
  }
  return `Your previous response was invalid: ${
    error instanceof Error ? error.message : "unknown error"
  }. Please respond again, strictly matching the required schema.`;
}

/**
 * Runs one model call and validates the reply, retrying (up to MAX_ATTEMPTS
 * calls in total) with the validation error fed back to the model.
 */
async function generateValidated<T>(
  system: string,
  prompt: string,
  validate: (json: unknown) => T
): Promise<T> {
  async function attempt(retryContext?: string): Promise<T> {
    const text = await generate(system, retryContext ? `${prompt}\n\n${retryContext}` : prompt);
    try {
      return validate(parseJsonObject(text));
    } catch (err) {
      throw new InvalidResponseError(err instanceof Error ? err.message : "invalid response", text);
    }
  }

  let lastError: unknown;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      return await attempt(i === 0 ? undefined : retryContextFor(lastError));
    } catch (err) {
      lastError = err;
    }
  }
  throw new AgentError(lastError instanceof Error ? lastError.message : "Agent failed");
}

export async function runCurator({
  vibe,
  tasteProfile,
}: {
  vibe: string;
  tasteProfile: TasteProfile | EmptyTasteProfile;
}): Promise<CuratorResponse> {
  return generateValidated(SYSTEM_PROMPT, buildUserPrompt(vibe, tasteProfile), (json) => {
    const response = CuratorResponseSchema.parse(json);
    assertNoteMatchesTracks(response.curator_note, response.tracks, { canAddTracks: true });
    return response;
  });
}

const NOTE_REWRITE_SYSTEM_PROMPT = `You are Groove, an AI DJ Agent. You built a set and wrote a curator note for it, but some of the songs couldn't be found on Spotify and were removed from the playlist. Rewrite the note so it covers exactly the remaining tracks, in their order. Keep the same language and voice, and reuse the original wording for the remaining tracks wherever it still fits — only change what's needed to drop the removed songs and keep the transitions smooth.

${CURATOR_NOTE_RULES}

OUTPUT FORMAT: Respond with a single raw JSON object and nothing else — no prose, no explanation, no markdown code fences:
{ "curator_note": "string" }`;

const RewrittenNoteSchema = z.object({ curator_note: CuratorResponseSchema.shape.curator_note });

/** Rewrites the curator note to cover only the tracks that were found on Spotify. */
export async function rewriteCuratorNote({
  vibe,
  curatorNote,
  removedTracks,
  remainingTracks,
}: {
  vibe: string;
  curatorNote: string;
  removedTracks: TrackSelection[];
  remainingTracks: TrackSelection[];
}): Promise<string> {
  const formatTracks = (tracks: TrackSelection[]) =>
    tracks.map((t, i) => `${i + 1}. ${t.artist} - "${t.title}"`).join("\n");
  const prompt = `User's vibe request: "${vibe}"

Original curator note:
${curatorNote}

Removed tracks (not on Spotify):
${formatTracks(removedTracks)}

Remaining tracks, in playback order:
${formatTracks(remainingTracks)}`;

  return generateValidated(NOTE_REWRITE_SYSTEM_PROMPT, prompt, (json) => {
    const { curator_note } = RewrittenNoteSchema.parse(json);
    assertNoteMatchesTracks(curator_note, remainingTracks, { canAddTracks: false });
    return curator_note;
  });
}
