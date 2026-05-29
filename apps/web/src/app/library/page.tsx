'use client';

import Link from 'next/link';
import { Trash2, Upload as UploadIcon } from 'lucide-react';
import type { Track } from '@resonate/shared/tracks';
import { TrackRow } from '@/components/track-row';
import { TrackRowSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { apiGet, apiSend, invalidate, useApi } from '@/lib/api';

export default function LibraryPage() {
  const { data, loading, error } = useApi('/api/library/uploads', (k) =>
    apiGet<{ tracks: Track[] }>(k),
  );
  const tracks = data?.tracks ?? [];

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
    try {
      await apiSend(`/api/tracks/${id}`, 'DELETE');
      invalidate('/api/library/uploads');
      toast.success('Track deleted');
    } catch (e) {
      toast.error('Could not delete', { description: (e as Error).message });
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your library</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Tracks you’ve uploaded, newest first.
          </p>
        </div>
        <Link href="/upload">
          <Button variant="primary" size="sm" className="gap-2">
            <UploadIcon size={14} />
            Upload more
          </Button>
        </Link>
      </div>

      {loading && tracks.length === 0 && (
        <div className="mt-8 space-y-1">
          <TrackRowSkeleton />
          <TrackRowSkeleton />
          <TrackRowSkeleton />
        </div>
      )}
      {error && (
        <p className="mt-12 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error.message}
        </p>
      )}
      {!loading && tracks.length === 0 && !error && (
        <div className="mt-12 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-16 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
            <UploadIcon size={20} />
          </div>
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">No uploads yet.</p>
          <Link href="/upload" className="mt-4 inline-block">
            <Button variant="primary">Upload your first track</Button>
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
                  onDelete(t.id, t.title);
                }}
                aria-label="Delete track"
                className="grid size-8 place-items-center rounded-full text-[var(--color-text-muted)] opacity-0 transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-danger)] group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            }
          />
        ))}
      </div>
    </main>
  );
}