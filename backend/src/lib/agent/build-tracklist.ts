
import { searchTracks } from "../spotify/search";
import type { SpotifyTrack } from "../spotify/types";

const TRACKS_PER_QUERY = 3;
const MAX_TRACKLIST_LENGTH = 20;

const VERSION_KEYWORDS =
  /(remaster(ed)?|remix|live|acoustic|edit|version|mix|mono|stereo|deluxe|bonus|demo|instrumental|karaoke|extended|radio|single|anniversary|edition|reissue|explicit|clean)/i;

// Strips version markers like "(Live)", "(Remastered 2011)", " - Radio Edit"
// so different releases of the same song dedupe to one entry.
function stripVersionMarkers(title: string): string {
  let stripped = title;

  const dashParts = stripped.split(/\s+-\s+/);
  if (dashParts.length > 1 && VERSION_KEYWORDS.test(dashParts[dashParts.length - 1])) {
    stripped = dashParts.slice(0, -1).join(" - ");
  }

  stripped = stripped.replace(/\s*[([][^)\]]*[)\]]/g, "");

  return stripped.trim();
}

function normalizeKey(track: SpotifyTrack): string {
  const artist = track.artists[0]?.name.toLowerCase().trim() ?? "";
  const title = stripVersionMarkers(track.name.toLowerCase().trim());
  return `${artist}::${title}`;
}

export async function buildTracklist(
  accessToken: string,
  searchQueries: string[]
): Promise<SpotifyTrack[]> {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const ordered: SpotifyTrack[] = [];

  for (const query of searchQueries) {
    const results = await searchTracks(accessToken, query, { limit: TRACKS_PER_QUERY });

    for (const track of results) {
      if (seenIds.has(track.id)) continue;
      const key = normalizeKey(track);
      if (seenKeys.has(key)) continue;

      seenIds.add(track.id);
      seenKeys.add(key);
      ordered.push(track);

      if (ordered.length >= MAX_TRACKLIST_LENGTH) {
        return ordered;
      }
    }
  }

  return ordered;
}
