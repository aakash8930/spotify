'use client';

import Link from 'next/link';
import { Heart, Play } from 'lucide-react';
import type { Track } from '@resonate/shared/tracks';
import { TrackRow } from '@/components/track-row';
import { TrackRowSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { apiGet, useApi } from '@/lib/api';
import { usePlayer } from '@/lib/player-store';

export default function LikesPage() {
  const { data, loading } = useApi('/api/library/likes', (k) => apiGet<{ tracks: Track[] }>(k));
  const tracks = data?.tracks ?? [];
  const playTrack = usePlayer((s) => s.playTrack);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-[var(--color-accent-2)] to-[var(--color-accent)]/40 shadow-[var(--shadow-card)] sm:size-24">
            <Heart size={32} className="fill-current text-white/80" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
              Playlist
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Liked tracks</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {tracks.length === 0
                ? 'Tap the heart on any track to start a collection.'
                : `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`}
            </p>
          </div>
        </div>
        {tracks.length > 0 && (
          <Button
            variant="primary"
            className="gap-2 self-start"
            onClick={() => playTrack(tracks[0]!, tracks)}
          >
            <Play size={14} className="fill-current" />
            Play
          </Button>
        )}
      </header>

      <div className="mt-10 space-y-1">
        {loading && tracks.length === 0 && (
          <>
            <TrackRowSkeleton />
            <TrackRowSkeleton />
            <TrackRowSkeleton />
          </>
        )}
        {!loading && tracks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-16 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Nothing here yet.</p>
            <Link href="/discover" className="mt-4 inline-block">
              <Button variant="secondary">Discover music</Button>
            </Link>
          </div>
        )}
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i} queue={tracks} initialLiked />
        ))}
      </div>
    </main>
  );
}