// Jamendo proxy. We never expose the client_id to the browser; the web app
// hits our /api/tracks/search?source=jamendo endpoint, we forward it.
//
// Docs: https://developer.jamendo.com/v3.0/tracks
import { TrackSource } from '@resonate/shared/tracks';
import { env } from '../env.js';

const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

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

export async function searchJamendo(q: string, limit: number, offset: number) {
  if (!env.JAMENDO_CLIENT_ID) {
    return { results: [] as NormalizedTrack[], available: false };
  }

  const url = new URL(`${JAMENDO_BASE}/tracks`);
  url.searchParams.set('client_id', env.JAMENDO_CLIENT_ID);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('search', q);
  url.searchParams.set('include', 'musicinfo');
  url.searchParams.set('audioformat', 'mp32');

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Jamendo error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { results?: JamendoTrack[] };

  return {
    available: true,
    results: (data.results ?? []).map(normalize),
  };
}

type JamendoTrack = {
  id: string;
  name: string;
  artist_name: string;
  album_name?: string;
  duration: number;
  audio: string;
  album_image?: string;
  image?: string;
};

const normalize = (t: JamendoTrack): NormalizedTrack => ({
  id: `jamendo:${t.id}`,
  source: 'JAMENDO',
  externalId: t.id,
  title: t.name,
  artist: t.artist_name,
  album: t.album_name ?? null,
  durationSec: t.duration,
  coverUrl: t.album_image ?? t.image ?? null,
  audioUrl: t.audio,
});
