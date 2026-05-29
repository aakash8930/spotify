// Saavn — unofficial JioSaavn API. Free, full-length streams, covers
// English, Hindi, Bollywood, Haryanvi, regional. No key required.
//
// Reverse-engineered third party. The base URL is configurable via
// `SAAVN_API_BASE` because there are several community deployments and any
// given one can go down — you can swap to a working mirror without
// touching code. Public mirrors known to work at time of writing:
//   https://saavn.dev/api
//   https://jiosaavn-api-privatecvc2.vercel.app
//   https://jiosaavn-api-with-playlist.vercel.app/api
// Self-hosted is most reliable: clone https://github.com/sumitkolhe/jiosaavn-api
// and deploy free on Vercel.
//
// If saavn.dev (or whatever you've configured) ever stops working, set
// SAAVN_API_BASE in .env to a different mirror and restart the API.

import { env } from '../env.js';
import type { TrackSource } from '@resonate/shared/tracks';

const SAAVN_BASE = env.SAAVN_API_BASE.replace(/\/$/, '');

export type NormalizedTrack = {
  id: string;
  source: TrackSource;
  externalId: string;
  title: string;
  artist: string;
  album: string | null;
  durationSec: number;
  coverUrl: string | null;
  audioUrl: string;
};

export async function searchSaavn(q: string, limit: number, offset: number) {
  const url = new URL(`${SAAVN_BASE}/search/songs`);
  url.searchParams.set('query', q);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('page', String(Math.floor(offset / limit) + 1));

  // 6-second timeout — the API is third-party and can be slow or
  // unresponsive. Don't make users wait 30 seconds for a search box.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6_000);
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`Saavn error ${res.status}: ${await res.text().catch(() => '')}`);
  }
  const json = (await res.json()) as SaavnSearchResponse;

  // Different mirrors have slightly different response shapes. Some put
  // results at `data.results`, some at `data.data.results`. Probe both.
  const results = json.data?.results ?? json.results ?? [];

  return {
    available: true,
    results: results
      .map(normalize)
      .filter((t): t is NormalizedTrack => t !== null),
  };
}

const normalize = (s: SaavnSong): NormalizedTrack | null => {
  const audioUrl = pickAudio(s.downloadUrl);
  if (!audioUrl) return null;

  return {
    id: `saavn:${s.id}`,
    source: 'SAAVN',
    externalId: s.id,
    title: decode(s.name),
    artist:
      s.artists?.primary?.map((a) => decode(a.name)).join(', ') ||
      decode(s.artists?.featured?.[0]?.name ?? 'Unknown artist'),
    album: s.album?.name ? decode(s.album.name) : null,
    durationSec: parseInt(String(s.duration ?? '0'), 10) || 0,
    coverUrl: pickImage(s.image),
    // Route playback through our API. JioSaavn CDN requires a specific
    // Referer header that browsers won't send for cross-origin <audio> —
    // without it the browser gets bytes it can't decode (MediaError 4).
    audioUrl: `/api/proxy/audio?url=${encodeURIComponent(audioUrl)}`,
  };
};

const QUALITY_ORDER = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'] as const;
const pickAudio = (urls: SaavnUrl[] | undefined): string | null => {
  if (!urls?.length) return null;
  for (const q of QUALITY_ORDER) {
    const hit = urls.find((u) => u.quality === q);
    if (hit?.url) return hit.url;
  }
  return urls[0]?.url ?? null;
};

const pickImage = (urls: SaavnUrl[] | undefined): string | null => {
  if (!urls?.length) return null;
  return (
    urls.find((u) => u.quality === '500x500')?.url ??
    urls.find((u) => u.quality === '150x150')?.url ??
    urls[urls.length - 1]?.url ??
    null
  );
};

const decode = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

type SaavnUrl = { quality: string; url: string };
type SaavnArtist = { id?: string; name: string };
type SaavnSong = {
  id: string;
  name: string;
  duration?: number | string;
  album?: { name?: string } | null;
  artists?: { primary?: SaavnArtist[]; featured?: SaavnArtist[] };
  image?: SaavnUrl[];
  downloadUrl?: SaavnUrl[];
};
type SaavnSearchResponse = {
  success?: boolean;
  data?: { total?: number; results?: SaavnSong[] };
  results?: SaavnSong[];
};
