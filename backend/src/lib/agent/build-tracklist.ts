
import { searchTracks } from "../spotify/search";
import type { SpotifyTrack } from "../spotify/types";
import type { TrackSelection } from "./schema";

const CANDIDATES_PER_TRACK = 3;
const MAX_TRACKLIST_LENGTH = 20;

const VERSION_KEYWORDS =
  /(remaster(ed)?|remix|live|acoustic|edit|version|mix|mono|stereo|deluxe|bonus|demo|instrumental|karaoke|extended|radio|single|anniversary|edition|reissue|explicit|clean)/i;

// Matches Unicode combining diacritical marks (U+0300–U+036F) left behind
// after NFKD normalization, e.g. turning "é" into "e" + combining acute accent.
const DIACRITIC_MARKS_PATTERN = /[\u0300-\u036f]/g;

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

// Folds accents/case/punctuation so "Beyoncé" / "beyonce", "Wilco" / "WILCO!"
// etc. compare equal.
function normalizeForCompare(value: string): string {
  return value
    .normalize("NFKD")
    .replace(DIACRITIC_MARKS_PATTERN, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titlesLikelyMatch(intendedTitle: string, actualTitle: string): boolean {
  const intended = normalizeForCompare(stripVersionMarkers(intendedTitle));
  const actual = normalizeForCompare(stripVersionMarkers(actualTitle));
  if (!intended || !actual) return false;
  return intended === actual || intended.includes(actual) || actual.includes(intended);
}

function artistLikelyMatches(intendedArtist: string, trackArtists: { name: string }[]): boolean {
  const intended = normalizeForCompare(intendedArtist);
  if (!intended) return false;
  return trackArtists.some((a) => {
    const candidate = normalizeForCompare(a.name);
    return candidate === intended || candidate.includes(intended) || intended.includes(candidate);
  });
}

// Guards against accepting a Spotify search hit that merely ranked high for
// the query but isn't actually the song the curator picked — otherwise a
// weak/loose query can surface an unrelated track into the playlist.
function isIntendedSong(selection: TrackSelection, track: SpotifyTrack): boolean {
  return titlesLikelyMatch(selection.title, track.name) && artistLikelyMatches(selection.artist, track.artists);
}

export async function buildTracklist(
  accessToken: string,
  tracks: TrackSelection[]
): Promise<SpotifyTrack[]> {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const ordered: SpotifyTrack[] = [];

  function isUsable(selection: TrackSelection, track: SpotifyTrack): boolean {
    return !seenIds.has(track.id) && !seenKeys.has(normalizeKey(track)) && isIntendedSong(selection, track);
  }

  for (const selection of tracks) {
    let candidates = await searchTracks(accessToken, buildStrictQuery(selection), {
      limit: CANDIDATES_PER_TRACK,
    });
    let match = candidates.find((track) => isUsable(selection, track));

    if (!match) {
      candidates = await searchTracks(accessToken, buildLooseQuery(selection), {
        limit: CANDIDATES_PER_TRACK,
      });
      match = candidates.find((track) => isUsable(selection, track));
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
