# Roadmap

Each phase is independently shippable. After each phase the app is usable end-to-end; later phases add capability rather than fixing earlier ones.

---

## Phase 1 — Foundation _(current)_

**Goal:** a logged-in user can search Jamendo and play any track in a persistent player.

- [x] Monorepo: pnpm workspaces + Turbo
- [x] Shared Zod schemas (`@resonate/shared`)
- [x] Prisma schema: User, Session, Track, Playlist, PlaylistTrack, Like, Room, RoomMember, RoomQueueItem, ChatMessage
- [x] Fastify API: signup, login, logout, me, track search
- [x] Lucia-shaped session auth (sessions table keyed by hashed token, sliding expiration)
- [x] Jamendo proxy (server-side; never expose client_id)
- [x] Next.js 15 web app: landing, auth pages, discover/search, persistent bottom player
- [x] docker-compose: Postgres + Redis + MinIO

**Try it:** sign up → search "lofi" on /discover → click a track → player plays across navigation.

---

## Phase 2 — Bring your own music

**Goal:** users upload MP3/FLAC, the server normalizes them, the catalog grows.

- [ ] `POST /api/tracks/upload` (multipart) — `music-metadata` extracts ID3 tags + cover art
- [ ] R2 / S3 / MinIO uploader with presigned URLs (large files bypass the API)
- [ ] Upload UI with drag-drop, batch progress, edit-after-upload metadata form
- [ ] Library page — grid of own uploads with delete + edit
- [ ] Playlist CRUD: create, rename, reorder tracks (drag-drop), delete, public/private toggle
- [ ] Like (heart) functionality with optimistic updates
- [ ] Postgres `pg_trgm` extension + GIN index on `Track(title, artist)` for fuzzy search

---

## Phase 3 — Listening rooms _(the differentiator)_

**Goal:** create a room, share a 6-char code, anyone who joins hears the same song at the same instant. Live chat.

- [ ] Socket.IO gateway as a separate process (`apps/realtime`) sharing the session cookie
- [ ] Room playback state in Redis: `{trackId, positionSec, isPlaying, serverTimeMs}`
- [ ] Drift correction on the client: every `STATE` event includes `serverTimeMs`; client computes true position as `state.positionSec + (clientNow - state.serverTimeMs) / 1000`
- [ ] Host controls: only the host can play/pause/seek; others can request via reactions
- [ ] Collaborative queue: any member adds tracks; host reorders
- [ ] Live chat with optimistic send + history paging
- [ ] Presence: avatar stack of who's in the room, typing indicators
- [ ] Room lobbies: public room directory, join by code, invite link

**Hard parts:**
- Initial join sync (new joiner hears the rest of the song from the right offset)
- Pausing the host's audio when their tab loses focus shouldn't pause everyone — distinguish host intent from browser throttling
- Network jitter: don't re-seek every 200ms — only correct if drift > 250ms

---

## Phase 4 — Polish that beats a clone

- [ ] **Dynamic theming**: extract dominant color from the current track's cover, animate the page background gradient. Uses `Vibrant` or canvas pixel sampling.
- [ ] **Glassmorphism player** with morphing waveform during playback (Web Audio API analyser node)
- [ ] **Daily Wrapped**: per-user listening minutes, top artists, genre drift, computed nightly into a `DailyStats` table — visible on the profile, no waiting until December
- [ ] **Command palette** (Cmd+K): search, jump to playlist, start a room, log out — all from keyboard
- [ ] **Keyboard shortcuts everywhere**: space (play/pause), `→/←` (next/prev), `m` (mute), `l` (like), `/` (focus search)
- [ ] **Service Worker**: cache last-played track + cover so tabs reopen offline-friendly
- [ ] **Crossfade** between tracks (Web Audio API, gain nodes)
- [ ] **Lyrics panel**: optional LRC upload alongside audio, time-synced display

---

## Stretch — not on the critical path

- Mobile app via Expo (shares `@resonate/shared`)
- HLS adaptive bitrate (transcode uploads to multiple bitrates with ffmpeg, store HLS playlist)
- AI DJ panel (LLM summarizes a 30-min set, embeddings of listening history pick the next track)
- Stem isolation (Demucs job queue → on-demand vocal/drum/bass tracks per song)
