'use client';

import type { Track } from '@resonate/shared/tracks';
import { TrackRow } from '@/components/track-row';
import { apiGet, useApi } from '@/lib/api';

export default function LikesPage() {
  const { data, loading } = useApi('/api/library/likes', (k) => apiGet<{ tracks: Track[] }>(k));
  const tracks = data?.tracks ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Liked tracks</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">Everything you’ve hearted, newest first.</p>

      {loading && tracks.length === 0 && (
        <p className="mt-12 text-center text-sm text-[var(--color-muted)]">Loading…</p>
      )}
      {!loading && tracks.length === 0 && (
        <p className="mt-16 text-center text-sm text-[var(--color-muted)]">
          Hit ♡ on any track to start a collection.
        </p>
      )}

      <div className="mt-8 space-y-1">
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} queue={tracks} initialLiked />
        ))}
      </div>
    </main>
  );
}
