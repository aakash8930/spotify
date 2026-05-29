'use client';

import { useEffect, useState } from 'react';
import type { Track } from '@resonate/shared/tracks';
import { TrackRow } from '@/components/track-row';

export default function DiscoverPage() {
  const [q, setQ] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [jamendoAvailable, setJamendoAvailable] = useState(true);

  useEffect(() => {
    if (!q.trim()) {
      setTracks([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tracks/search?q=${encodeURIComponent(q)}`, {
          credentials: 'include',
          signal: ctrl.signal,
        });
        const data = (await res.json()) as { tracks: Track[]; jamendoAvailable: boolean };
        setTracks(data.tracks);
        setJamendoAvailable(data.jamendoAvailable);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Discover</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Search Jamendo and your uploads. Click any track to play.
      </p>

      <input
        autoFocus
        placeholder="Search artists, songs, albums…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-8 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-lg outline-none focus:border-[var(--color-accent)]"
      />

      {!jamendoAvailable && q && (
        <p className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200">
          Jamendo isn’t configured yet. Set <code>JAMENDO_CLIENT_ID</code> in your{' '}
          <code>.env</code> to search the public catalog.
        </p>
      )}

      <div className="mt-6 space-y-1">
        {loading && tracks.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">Searching…</p>
        )}
        {!loading && q && tracks.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">No results</p>
        )}
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} queue={tracks} />
        ))}
      </div>
    </main>
  );
}
