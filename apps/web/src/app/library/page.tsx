'use client';

import Link from 'next/link';
import type { Track } from '@resonate/shared/tracks';
import { TrackRow } from '@/components/track-row';
import { apiGet, apiSend, invalidate, useApi } from '@/lib/api';

export default function LibraryPage() {
  const { data, loading, error } = useApi('/api/library/uploads', (k) =>
    apiGet<{ tracks: Track[] }>(k),
  );
  const tracks = data?.tracks ?? [];

  const onDelete = async (id: string) => {
    if (!confirm('Delete this track? This cannot be undone.')) return;
    await apiSend(`/api/tracks/${id}`, 'DELETE');
    invalidate('/api/library/uploads');
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Your library</h1>
        <Link href="/upload" className="text-sm text-[var(--color-accent)] hover:underline">
          Upload more
        </Link>
      </div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">Tracks you’ve uploaded.</p>

      {loading && tracks.length === 0 && (
        <p className="mt-12 text-center text-sm text-[var(--color-muted)]">Loading…</p>
      )}
      {error && (
        <p className="mt-12 text-center text-sm text-red-400">{error.message}</p>
      )}
      {!loading && tracks.length === 0 && !error && (
        <div className="mt-16 rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
          <p className="text-sm text-[var(--color-muted)]">No uploads yet.</p>
          <Link
            href="/upload"
            className="mt-4 inline-block rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-black"
          >
            Upload your first track
          </Link>
        </div>
      )}

      <div className="mt-8 space-y-1">
        {tracks.map((t, i) => (
          <TrackRow
            key={t.id}
            track={t}
            index={i}
            queue={tracks}
            trailing={
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(t.id);
                }}
                aria-label="Delete track"
                className="ml-2 text-[var(--color-muted)] hover:text-red-400"
              >
                ✕
              </button>
            }
          />
        ))}
      </div>
    </main>
  );
}
