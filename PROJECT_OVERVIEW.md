# Groove — Project Overview

**One-line pitch:** Groove is an AI DJ agent. A user types a "vibe" in plain language, and an LLM curates an 8–12 track playlist tuned to that vibe plus the user's own Spotify listening history, then creates it as a real playlist in their Spotify account.

## Target user & core loop
Spotify listeners who want a playlist for a specific mood/moment ("rainy Sunday coffee shop," "80s Miami," "just got dumped") without manually building it. The loop: describe vibe → AI curates tracklist with reasoning → review/create in Spotify → optionally share to a public feed → others browse/like shared playlists.

## Current features
1. **Spotify OAuth login** — full account connection, not just an API key.
2. **Vibe-to-playlist curation** — free-text vibe input → LLM returns: track list (artist+title pairs), a "curator's note" explaining the sequencing logic (DJ-style set arc: energy, tempo, flow), a generated playlist title + description, and mood parameters (energy level, descriptor tags, ordering intent).
3. **Personalization** — pulls the user's top Spotify artists, top genres (aggregated from artist genres), and sample recently-played tracks, and feeds that into the prompt as a "taste profile." Vibe intent is explicitly weighted *above* taste profile (a "hardcore techno festival" vibe should produce hardcore techno even for a jazz listener) — taste profile just shapes specific picks within the vibe.
4. **Real Spotify playlist creation** — once the user confirms, it actually creates the playlist in their Spotify library (not just a preview).
5. **Social feed** — users can mark a curated playlist as shared; a public feed shows shared playlists (sorted by recency or popularity), with like/unlike.
6. **Profile page** — three sections: "top vibes" (a tag cloud built from aggregating mood-parameter descriptors across the user's playlists, sized by frequency), "your playlists" (own curated playlists), "prompt history" (every vibe string ever submitted, with delete).

## What personalization currently does NOT use
- No Spotify audio-features/audio-analysis API (tempo, key, danceability, valence, etc.) — deliberately not used; the LLM relies purely on its own knowledge of songs/artists/genres.
- No Spotify Recommendations API.
- No explicit thumbs up/down feedback loop on individual tracks or past playlists feeding back into future curation.
- No collaborative filtering — personalization is single-user, based only on that user's own top artists/genres/recent tracks.

## Tech stack (for context on what's feasible)
- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind, shadcn/base-ui components.
- **Backend:** separate Express + TypeScript service. Owns Spotify OAuth, the database, and all LLM/Spotify calls.
- **LLM:** OpenAI (`gpt-4o` by default) via the Vercel AI SDK, provider/model swappable through env (`AI_PROVIDER` / `AI_MODEL`, see `backend/src/lib/agent/model.ts`); structured-output/schema-constrained generation, one retry on invalid output.
- **DB:** Postgres (Neon, serverless) via Drizzle ORM.
- **Auth/session:** JWT session cookie holding Spotify access/refresh tokens; backend silently refreshes near expiry.

## Data model
- `users` — Spotify identity.
- `playlists` — one row per curated playlist: title/description/curator note, mood parameters (jsonb), full resolved track list (jsonb), Spotify playlist id/url, share state, like count.
- `promptHistory` — every vibe string a user submitted.
- `playlistLikes` — join table for the social feed.

## Where it stands / scale
This is a solo/personal project (single dev, ~9 commits, still in active early development — profile page and social feed were both added recently). No production deployment infra beyond local dev has been set up yet.

## What I want help thinking about
Given the above, I'm looking for ideas on:
- New features that would meaningfully improve the curation quality or personalization (e.g. using audio features, feedback loops, refining/iterating on a playlist rather than one-shot generation).
- Social/discovery features beyond a basic like+feed (following users, remixing someone else's playlist, comments, collaborative playlists).
- Ways to make the "vibe" input more expressive (multi-turn refinement, combining a vibe with a specific artist/reference playlist, mood sliders, negative constraints like "no [genre]").
- Retention/engagement mechanics for a project like this (streaks, weekly recap, "on this day" style resurfacing of past playlists).
- Any technical or product risks in the current one-shot LLM-curation approach worth flagging.
