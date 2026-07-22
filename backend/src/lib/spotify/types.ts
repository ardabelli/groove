export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: SpotifyImage[];
  };
  external_urls: { spotify: string };
  duration_ms: number;
  explicit: boolean;
}

export interface SpotifyProfile {
  id: string;
  display_name: string | null;
  email?: string;
  images: SpotifyImage[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  external_urls: { spotify: string };
}
