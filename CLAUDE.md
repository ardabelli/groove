@AGENTS.md

# Groove

Groove is an AI DJ agent: users describe a "vibe" in natural language, an LLM curates an 8-12 track playlist tuned to that vibe and the user's Spotify listening history, and the app creates it as a real playlist in the user's Spotify account. Users can also share curated playlists to a social feed, like others' playlists, and browse their own prompt/playlist history.

## Architecture

Two separate apps that talk over HTTP — not a single Next.js monorepo with API routes.

- **Frontend** (repo root): Next.js 16 (App Router) + React 19 + TypeScript. Runs on `http://127.0.0.1:3000`.
- **Backend** (`backend/`): Express + TypeScript, run via `tsx`. Runs on `http://127.0.0.1:8000`. Owns Spotify OAuth, the Postgres database, and all calls to the LLM and Spotify Web API.

**Must use `127.0.0.1`, not `localhost`, for local dev** — the backend's CORS (`FRONTEND_URL`) and Spotify's OAuth redirect URI are pinned to `127.0.0.1`.

The frontend never talks to Spotify or Groq directly; it calls the backend, which holds the Spotify access/refresh tokens in a signed session cookie (`groove_session`, JWT via `jsonwebtoken`) and proxies everything.

### Request flow: curating a playlist

1. User submits a vibe string from `src/components/curate/vibe-form.tsx`.
2. Frontend calls `POST /api/curate` on the backend.
3. Backend (`backend/src/routes/curate.ts`) loads the user's Spotify taste profile (`backend/src/lib/agent/taste-profile.ts`, built from `backend/src/lib/spotify/top-items.ts`).
4. `backend/src/lib/agent/curator.ts` calls Groq (`openai/gpt-oss-120b` via `@ai-sdk/groq`) with a structured-output schema (`backend/src/lib/agent/schema.ts`) to get back a track list, curator note, title/description, and mood parameters. One retry on schema validation failure.
5. `backend/src/lib/agent/build-tracklist.ts` resolves each `{artist, title}` pair to a real Spotify track via `backend/src/lib/spotify/search.ts`.
6. Result flows back as a `CurateResult` (`src/lib/types.ts`) and renders via `curator-note-card.tsx`, `track-list.tsx`, `playlist-cta.tsx`.
7. Confirming the CTA calls `POST /api/playlist`, which creates the playlist in the user's actual Spotify account (`backend/src/lib/spotify/playlists.ts`) and persists it to the `playlists` table.

### Auth

Spotify OAuth (Authorization Code flow), handled entirely by the backend (`backend/src/routes/auth.ts`, `backend/src/lib/session.ts`):
- Redirect URI: `http://127.0.0.1:8000/api/auth/callback` (must match the Spotify Developer Dashboard app config exactly).
- On success, backend signs a JWT session cookie containing `userId`, Spotify `accessToken`/`refreshToken`, and `expiresAt`.
- `getAuthContext()` transparently refreshes the Spotify access token when it's within 60s of expiry and re-issues the cookie; throws `AuthError` (→ caller should treat as unauthenticated) if refresh fails.
- No separate frontend auth/session library — the cookie is the only source of truth, read only on the backend.

### Data model (Postgres via Drizzle, `backend/src/db/schema.ts`)

- `users` — Spotify identity (`id`, `email`, `displayName`, `imageUrl`) plus `credits`, the prompt-credit balance gating `/api/curate` (new users start with `FREE_CREDITS`, see `backend/src/lib/credits/types.ts`).
- `playlists` — one row per curated playlist: owner, title/description/curatorNote, `moodParameters` (jsonb), `tracks` (jsonb `TrackDTO[]`), Spotify playlist id/url, `isShared`/`sharedAt`/`likeCount` for the social feed. Indexed for owner lookups and the shared feed (by recency and by popularity).
- `promptHistory` — every vibe string a user has submitted, for their profile page.
- `playlistLikes` — join table, composite PK `(playlistId, userId)`.
- `adRewards` — one row per rewarded-ad token issued by `/api/credits/ad/start`, redeemed once by `/api/credits/ad/complete` to add a credit (short TTL, single-use, enforced atomically in `db/ads.ts`).

DB access is grouped by table in `backend/src/db/{users,playlists,prompts}.ts`; connection/client setup in `backend/src/db/index.ts` (Neon serverless Postgres). Migrations are Drizzle-generated SQL in `backend/drizzle/`.

### Backend API surface (`backend/src/routes/`)

| Route | Concern |
|---|---|
| `/api/auth` | Spotify OAuth login/callback/logout |
| `/api/curate` | Run the curator agent, resolve tracks |
| `/api/playlist` | Create the playlist in Spotify + persist it |
| `/api/social` | Shared feed, like/unlike |
| `/api/prompts` | Prompt history, delete |
| `/api/credits` | Prompt credit balance; earn credits via rewarded ad |

### Frontend structure (`src/`)

- `app/page.tsx` — main curate flow; `app/profile/page.tsx` — user's playlists, prompt history, tag cloud.
- `components/curate/` — vibe input → curator note → track list → "create in Spotify" CTA.
- `components/social/` — shared feed, playlist cards, like button.
- `components/profile/` — own playlists, prompt history, tag cloud, profile nav.
- `components/ui/` — shadcn/base-ui primitives (button, card, dialog, sheet, etc.) — don't hand-roll these, extend via `components.json` / shadcn conventions instead.
- `lib/types.ts` — all cross-cutting DTOs and `{ok: true/false}` result types shared conceptually with the backend (kept in sync by hand, not a shared package).
- `lib/backend.ts` — typed fetch wrapper for calling the Express backend.

### Result-type convention

Backend responses and frontend API calls use a discriminated union `{ ok: true, data: ... } | { ok: false, error: <ErrorCode>, message? }` per feature (`CurateResult`, `CreatePlaylistResult`, `ShareResult`, `LikeResult`, etc. in `src/lib/types.ts`). Error codes are a closed string union per endpoint (e.g. `"unauthenticated" | "not_found" | "forbidden" | "unknown"`) — follow this pattern for any new endpoint rather than throwing raw errors across the fetch boundary.

## Environment

Frontend `.env.local`: `NEXT_PUBLIC_BACKEND_URL` (backend origin).

Backend `.env`: `PORT`, `FRONTEND_URL`, `AUTH_SPOTIFY_ID`, `AUTH_SPOTIFY_SECRET`, `SPOTIFY_REDIRECT_URI`, `SESSION_SECRET` (`openssl rand -base64 32`), `GROQ_API_KEY`, `DATABASE_URL` (Neon).

## Commands

Frontend (repo root):
- `npm run dev` — Next.js dev server on :3000
- `npm run build` / `npm run start` — production build/serve
- `npm run lint` — ESLint

Backend (`backend/`):
- `npm run dev` — `tsx watch src/index.ts`, on :8000
- `npm run typecheck` — `tsc` (no build step; run this before considering backend work done)
- `npm run db:generate` / `npm run db:migrate` — Drizzle Kit schema migrations

Both servers must be running for the app to work end-to-end.

## Conventions to follow

- This is Next.js 16 with breaking changes from older Next.js training data — check `node_modules/next/dist/docs/` before relying on remembered Next.js APIs (see `AGENTS.md`).
- Keep the frontend a thin client: no Spotify/Groq calls, no DB access, no secrets in `src/`. All of that lives in `backend/`.
- New backend endpoints: colocate route handler in `routes/`, business logic in `lib/`, DB queries in `db/`, and add a matching discriminated-union result type + DTO in `src/lib/types.ts`.
- The curator agent's system prompt (`backend/src/lib/agent/curator.ts`) encodes real product rules (vibe fit over taste profile, no duplicate versions of a song, `tracks` is the source of truth for every other field, 8-12 tracks). Treat it as product logic, not boilerplate — read it before changing curation behavior.
