# Resonate

> Real-time synced music listening rooms. Search a multilingual catalog, upload your own tracks, build playlists, and host rooms where everyone hears the same song at the same instant — even across devices.

A full-stack web app I built end-to-end: monorepo, type-safe API, realtime gateway, multi-source catalog, audio proxy, R2-compatible uploads, polished UI. Started as a static Spotify clone and rebuilt from scratch into a real platform.

**Live demo:** [coming soon] · **Stack:** Next.js 15 · Fastify 5 · Socket.IO · Prisma · TypeScript

<!-- Drop hero screenshot here once captured -->
<!-- ![Resonate hero](./docs/hero.png) -->

---

## Why I built this

The original brief was a Spotify clone — a static page with hard-coded `<audio>` tags. I rewrote it because that exercise teaches almost nothing. The version in this repo is what I'd actually want from a hobby music app: synced listening with friends, a real catalog including Indian music, and an architecture that could scale beyond a single user.

Three problems made this interesting to engineer:

1. **Sub-250ms playback sync across devices** without a media server, just over WebSockets and HTTP audio.
2. **A real Indian + global music catalog with no licensing budget**, while keeping the door open to swap providers without touching the rest of the code.
3. **A single audio element that survives navigation** but hands off cleanly to a different player when the user enters a listening room — because two competing audio elements is the worst kind of bug.

---

## Highlights

### Real-time synchronized playback

The hardest part. The server holds an authoritative tuple per room: `(currentTrack, basePositionSec, anchorTimeMs, isPlaying)`. Clients estimate their clock offset to the server during the WebSocket handshake (round-trip-corrected), then compute the *true* live position locally:

```
livePos = basePositionSec + (clientNow - clockOffsetMs - anchorTimeMs) / 1000
```

Each client compares that against its own `<audio>.currentTime` and re-seeks **only when drift exceeds 250 ms**. Below the threshold, local playback continues unchanged — re-seeking on every server tick produces audible glitches.

Other design calls worth mentioning:
- The host's tab is the sole authority on track-end, gated server-side, so non-hosts don't double-advance the queue.
- A user can have multiple tabs open; we track them as a `Set<socketId>` and only fully leave when the last socket drops.
- Host disconnect transfers the role to the next member instead of killing the room.

Code: [`apps/api/src/realtime/state.ts`](./apps/api/src/realtime/state.ts), [`apps/api/src/realtime/gateway.ts`](./apps/api/src/realtime/gateway.ts), [`apps/web/src/lib/room-store.ts`](./apps/web/src/lib/room-store.ts)

### Pluggable catalog with normalized track shape

Every audio source — community JioSaavn API, Jamendo, user uploads — gets normalized to one `Track` shape. The web app never knows or cares which provider a track came from. Switching providers is one file.

```ts
type Track = {
  id: string;
  source: 'SAAVN' | 'JAMENDO' | 'UPLOAD';
  title: string;
  artist: string;
  album: string | null;
  durationSec: number;
  coverUrl: string | null;
  audioUrl: string;
  // ...
};
```

Search hits providers in parallel via `Promise.all`, with timeouts and graceful degradation — if the external catalog goes down, search falls back to user uploads with a UI warning.

Code: [`apps/api/src/lib/saavn.ts`](./apps/api/src/lib/saavn.ts), [`apps/api/src/routes/tracks.ts`](./apps/api/src/routes/tracks.ts)

### Custom audio proxy for hostile CDNs

The JioSaavn CDN serves real MP4 audio, but expects a `Referer: https://www.jiosaavn.com/` header — without it, browsers receive bytes they can't decode (`MediaError code 4`). Browsers won't send referrers on cross-origin media URLs.

Solution: an audio proxy at `/api/proxy/audio?url=…` that streams bytes through our origin with the right headers, passes `Range` requests through (so seeking works), and restricts proxied hostnames to a regex allowlist. This isn't an open proxy.

Code: [`apps/api/src/routes/proxy.ts`](./apps/api/src/routes/proxy.ts)

### Type safety end-to-end via shared Zod schemas

The API and web app share a single `@resonate/shared` package full of Zod schemas. A field rename in the schema is a TypeScript error in both apps simultaneously. No DTO drift, no manually-mirrored types.

```ts
// packages/shared/src/rooms.ts
export const ChatMessage = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  username: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;
```

Server validates inputs at the edge with `safeParse`, client gets `z.infer` types — same source of truth.

### Persistent player that hands off cleanly

A single `<audio>` element lives in the root layout and survives every route transition (the trick is just rendering it from the layout, not a page). When a user enters `/rooms/[code]`, that page sets `document.body.dataset.inRoom = '1'`. The global `PlayerShell` watches that attribute via `MutationObserver` and renders nothing — so the room view's own audio element takes over without two competing for output.

Code: [`apps/web/src/components/player-shell.tsx`](./apps/web/src/components/player-shell.tsx)

### Other things I'm proud of

- **Lucia-shaped session auth without the Lucia dependency.** ~60 lines, sessions table keyed by SHA-256-hashed tokens (so a DB leak doesn't expose live tokens), sliding expiration. Same shape as Lucia v3 so swapping is trivial if needed.
- **Drag-to-reorder playlists with optimistic UI.** Negative-position trick to avoid `(playlistId, position)` collisions in a single transaction.
- **S3-compatible storage layer** — works against Cloudflare R2 (production), MinIO (local Docker), or any other S3 endpoint, with auto-bucket bootstrap on dev startup.
- **Keyboard shortcuts everywhere** — space, shift-arrows, `m` for mute, `/` to focus search. Smart enough to skip when an input is focused.
- **Mobile-first responsive design** — sidebar collapses to a bottom tab bar, player reflows, safe-area insets respected.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind v4 | Streaming, server components, modern tooling |
| Backend | Fastify 5 + Socket.IO | Fastest Node HTTP framework; same process for REST + WS |
| State | Zustand | Two stores (`player`, `room`); no boilerplate, no providers |
| Database | Prisma + SQLite (dev) / Postgres (prod) | Type-safe, migration-friendly, swappable provider |
| Validation | Zod (shared package) | One source of truth across web + api |
| Realtime | Socket.IO | Cookie auth, rooms primitive, reconnection out of the box |
| Storage | Cloudflare R2 / MinIO (S3-compatible) | R2 has free egress — critical for streaming audio |
| Audio | Native `<audio>` + custom proxy | No third-party player, full control |
| Monorepo | pnpm workspaces + Turborepo | Workspace-aware installs, parallel + cached tasks |
| UI | shadcn-style primitives, lucide-react, sonner | No heavy component lib; bespoke where it matters |
| DX | TypeScript strict, ESLint, Prettier, Prisma Studio | |

---

## Screenshots

<!-- Drop these screenshots after capturing them -->

| Discover | Listening room | Playlist |
|---|---|---|
| ![Discover](./docs/discover.png) | ![Room](./docs/room.png) | ![Playlist](./docs/playlist.png) |

| Mobile player | Upload | Sign in |
|---|---|---|
| ![Mobile](./docs/mobile.png) | ![Upload](./docs/upload.png) | ![Auth](./docs/auth.png) |

---

## Architecture

```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│   apps/web (Next.js)        │         │   apps/api (Fastify)        │
│                             │ HTTP    │                             │
│  Server components          │ ◄─────► │  REST routes                │
│  Persistent audio shell     │         │   • auth, tracks, playlists │
│  Zustand: player + room     │ Socket  │   • rooms, library, likes   │
│                             │ ◄─────► │   • upload, audio proxy     │
└──────────────▲──────────────┘  .IO    │                             │
               │                        │  Socket.IO gateway          │
               │ shared schemas         │   • cookie session auth     │
               │                        │   • RoomState (in-memory)   │
┌──────────────┴──────────────┐         │   • broadcast playback      │
│   packages/shared (Zod)     │         │                             │
│   packages/db (Prisma)      │         └──────┬──────────────────────┘
└─────────────────────────────┘                │
                                               ▼
                          ┌────────────┬───────────────┬───────────────┐
                          │  SQLite/PG │ Cloudflare R2 │ JioSaavn API  │
                          │  Prisma    │ S3 SDK        │ Saavn proxy   │
                          └────────────┴───────────────┴───────────────┘
```

Repo layout:

```
apps/
  web/              Next.js 15 app — pages, components, stores
  api/              Fastify server — REST routes, realtime gateway, providers
packages/
  shared/           Zod schemas + TypeScript types
  db/               Prisma schema + generated client + seed
docker-compose.yml  Optional local Postgres + Redis + MinIO
```

---

## Run it locally

You need Node 20+ and `pnpm` (auto-installed via Corepack). No Docker, no Postgres setup — SQLite by default.

```bash
corepack enable
pnpm install

# Database (file lives at packages/db/dev.db)
pnpm db:push
pnpm --filter @resonate/db db:seed   # demo: demo@resonate.app / demo1234

# Generate a session secret and write .env
cat > .env <<EOF
DATABASE_URL="file:./dev.db"
SESSION_SECRET="$(openssl rand -base64 48)"
WEB_ORIGIN="http://localhost:3000"
API_ORIGIN="http://localhost:4000"
SAAVN_API_BASE="https://saavn-api-eight.vercel.app/api"
NODE_ENV="development"
EOF

pnpm dev
```

Web on **localhost:3000**, API on **localhost:4000**.

> Want a real catalog of Hindi/Bollywood/Punjabi/global music? `SAAVN_API_BASE` points at a community JioSaavn-compatible API. The default works at time of writing. If it ever goes down, swap to `https://saavn.dev/api` or self-host [`sumitkolhe/jiosaavn-api`](https://github.com/sumitkolhe/jiosaavn-api) on Vercel free tier in 60 seconds.

---

## Engineering decisions, called out

**Why two apps instead of Next.js fullstack?** The API is reused by the realtime room server (Socket.IO) and any future mobile client. API routes inside Next would couple lifetimes — the realtime gateway needs a long-lived process, Next routes don't.

**Why my own session auth instead of Lucia / NextAuth?** Lucia v3 is being deprecated; NextAuth couples auth to Next. The shape I needed (sessions table, hashed tokens, sliding expiry) is ~60 lines. Reading and writing your own auth code teaches you a lot about what frameworks hide.

**Why Zustand over Redux/Context?** Two stores — `usePlayer` and `useRoom` — drive the entire app. No actions, reducers, or providers. The whole player store is 100 lines.

**Why community JioSaavn API instead of Spotify/Apple Music?** Spotify Web API has 30-second previews unless you're a paying customer with a registered app. The community Saavn mirrors give full-length tracks. I documented the legal grey area in the README — fine for a portfolio project, not for a monetized product.

**Why an in-memory `RoomState` instead of Redis from day one?** Premature scaling adds complexity I don't need yet. Each method on `RoomState` is the seam where Redis pub/sub goes when I outgrow one Node process — the swap is mechanical.

**Why SQLite as the default?** Zero-setup onboarding. The Prisma schema is portable to Postgres with a one-line provider change. A reviewer should be able to clone, install, and run in three commands.

---

## What's not done yet

Honest roadmap, not a wishlist:

- **Daily listening stats** — schema is in place, the aggregation job and visualization aren't.
- **Dynamic theming from cover art** — `Vibrant.js` extraction → animated page background.
- **Crossfade between tracks** — Web Audio API gain nodes; the player store already supports the queue model needed.
- **Postgres full-text + `pg_trgm`** — currently using `LIKE %q%` since SQLite is the default; works but not ideal at scale.
- **Mobile app via Expo** — the shared Zod package is already structured for this.
- **Stem isolation (Demucs)** — heavier infra; planned as a stretch goal.

---

## What I learned

Some things I knew before but cemented while building this; others were genuinely new.

- Real-time sync is mostly a math problem. Once you accept that perfect alignment is impossible (clocks drift, networks vary), the question becomes *what error budget is imperceptible* — and that's how I landed on 250 ms.
- Browsers are surprisingly hostile to cross-origin audio. The `MediaError code 4` rabbit hole taught me more about HTTP referrers, range requests, and CORS than any tutorial would.
- Type-safe end-to-end with shared Zod beats almost any runtime guard. Caught half a dozen bugs at compile time that would have been silent in production.
- pnpm + Turbo monorepos are genuinely good now. Workspace deps, scoped scripts, cache invalidation all *just work* — a different experience from Lerna two years ago.
- Don't ship Spotify clones. Ship the next problem you'd actually want solved if Spotify didn't exist.

---

## About me

Built by [Aakash](https://github.com/aakash8930) — full-stack engineer interested in systems that have to be correct *and* feel good to use.

If you're reading this from a hiring context, the parts of the codebase I'd point you to first:

- [`apps/api/src/realtime/gateway.ts`](./apps/api/src/realtime/gateway.ts) — the Socket.IO room logic
- [`apps/api/src/realtime/state.ts`](./apps/api/src/realtime/state.ts) — anchor-time math
- [`apps/web/src/lib/room-store.ts`](./apps/web/src/lib/room-store.ts) — clock-offset estimation
- [`apps/api/src/routes/proxy.ts`](./apps/api/src/routes/proxy.ts) — the audio proxy
- [`packages/shared`](./packages/shared) — the type-safety story

Reach out: [GitHub](https://github.com/aakash8930) · [issues for bugs and ideas](https://github.com/aakash8930/spotify/issues)
