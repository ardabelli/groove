
import { searchTracks } from "../spotify/search";
import type { SpotifyTrack } from "../spotify/types";
import type { TrackSelection } from "./schema";

const CANDIDATES_PER_TRACK = 3;
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

// Uses all credited artists (sorted) rather than just the first, so the same
// song re-issued under a different artist credit order still dedupes.
function normalizeKey(track: SpotifyTrack): string {
  const artists = track.artists
    .map((a) => a.name.toLowerCase().trim())
    .sort()
    .join(",");
  const title = stripVersionMarkers(track.name.toLowerCase().trim());
  return `${artists}::${title}`;
}

function escapeQueryValue(value: string): string {
  return value.replace(/"/g, "");
}

function buildStrictQuery({ artist, title }: TrackSelection): string {
  return `artist:"${escapeQueryValue(artist)}" track:"${escapeQueryValue(title)}"`;
}

function buildLooseQuery({ artist, title }: TrackSelection): string {
  return `${artist} ${title}`;
}

export async function buildTracklist(
  accessToken: string,
  tracks: TrackSelection[]
): Promise<SpotifyTrack[]> {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const ordered: SpotifyTrack[] = [];

  function isUsable(track: SpotifyTrack): boolean {
    return !seenIds.has(track.id) && !seenKeys.has(normalizeKey(track));
  }

  for (const selection of tracks) {
    let candidates = await searchTracks(accessToken, buildStrictQuery(selection), {
      limit: CANDIDATES_PER_TRACK,
    });
    let match = candidates.find(isUsable);

    if (!match) {
      candidates = await searchTracks(accessToken, buildLooseQuery(selection), {
        limit: CANDIDATES_PER_TRACK,
      });
      match = candidates.find(isUsable);
    }

    if (!match) continue;

    seenIds.add(match.id);
    seenKeys.add(normalizeKey(match));
    ordered.push(match);

    if (ordered.length >= MAX_TRACKLIST_LENGTH) {
      return ordered;
    }
  }

  return ordered;
}
