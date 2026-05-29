'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Track } from '@resonate/shared/tracks';
import { TrackRow } from '@/components/track-row';
import { TrackRowSkeleton } from '@/components/ui/skeleton';

const SUGGESTIONS = ['arijit singh', 'haryanvi hits', 'lofi', 'punjabi', 'chill', 'workout'];

export default function DiscoverPage() {
  const [q, setQ] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [catalogAvailable, setCatalogAvailable] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus the search box and respond to "/" hotkey when nothing is focused.
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (e.key === '/' && tgt?.tagName !== 'INPUT' && tgt?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        const data = (await res.json()) as {
          tracks: Track[];
          catalogAvailable?: boolean;
          jamendoAvailable?: boolean;
        };
        setTracks(data.tracks);
        setCatalogAvailable(data.catalogAvailable ?? data.jamendoAvailable ?? false);
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
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Discover</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Search across the catalog and your uploads. Click any track to play.
        </p>
      </div>

      <div className="relative mt-8">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
        />
        <input
          ref={inputRef}
          placeholder="Search artists, songs, albums…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3.5 pl-12 pr-12 text-base outline-none transition-colors focus:border-[var(--color-accent)]"
        />
        <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-subtle)] sm:block">
          /
        </kbd>
      </div>

      {!q && (
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
            Try
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQ(s)}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!catalogAvailable && q && (
        <p className="mt-6 rounded-lg border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 px-4 py-3 text-sm text-[var(--color-warn)]">
          External catalog isn’t reachable right now. Set <code>SAAVN_API_BASE</code> in your{' '}
          <code>.env</code> to a working mirror, or upload your own tracks.
        </p>
      )}

      <div className="mt-6 space-y-1">
        {loading && tracks.length === 0 && (
          <>
            <TrackRowSkeleton />
            <TrackRowSkeleton />
            <TrackRowSkeleton />
            <TrackRowSkeleton />
            <TrackRowSkeleton />
          </>
        )}
        {!loading && q && tracks.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            No results for “{q}”
          </p>
        )}
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} queue={tracks} />
        ))}
      </div>
    </main>
  );
}