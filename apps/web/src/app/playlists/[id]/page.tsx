'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ListMusic, Play, Trash2, X } from 'lucide-react';
import type { PlaylistWithTracks } from '@resonate/shared/playlists';
import type { Track } from '@resonate/shared/tracks';
import { apiGet, apiSend, invalidate } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TrackRowSkeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toaster';
import { usePlayer } from '@/lib/player-store';
import { useAuth } from '@/components/auth-provider';
import { LikeButton } from '@/components/like-button';
import { cn, fmtTime } from '@/lib/utils';

export default function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const playTrack = usePlayer((s) => s.playTrack);
  const [pl, setPl] = useState<PlaylistWithTracks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet<{ playlist: PlaylistWithTracks }>(`/api/playlists/${id}`)
      .then((r) => setPl(r.playlist))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = pl && user && pl.ownerId === user.id;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    if (!pl || !e.over || e.active.id === e.over.id) return;
    const oldIdx = pl.tracks.findIndex((t) => t.id === e.active.id);
    const newIdx = pl.tracks.findIndex((t) => t.id === e.over!.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(pl.tracks, oldIdx, newIdx);
    setPl({ ...pl, tracks: next });
    try {
      await apiSend(`/api/playlists/${id}/order`, 'PUT', { trackIds: next.map((t) => t.id) });
    } catch (err) {
      toast.error('Could not save order', { description: (err as Error).message });
    }
  };

  const removeTrack = async (trackId: string) => {
    if (!pl) return;
    setPl({ ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) });
    await apiSend(`/api/playlists/${id}/tracks/${trackId}`, 'DELETE');
    invalidate('/api/playlists');
  };

  const deletePlaylist = async () => {
    if (!confirm(`Delete “${pl?.name}”? This cannot be undone.`)) return;
    try {
      await apiSend(`/api/playlists/${id}`, 'DELETE');
      invalidate('/api/playlists');
      toast.success('Playlist deleted');
      router.push('/playlists');
    } catch (err) {
      toast.error('Could not delete playlist', { description: (err as Error).message });
    }
  };

  if (error)
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      </main>
    );
  if (loading || !pl)
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex items-end gap-6">
          <div className="size-40 rounded-2xl bg-[var(--color-surface-2)]" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-16 rounded bg-[var(--color-surface-2)]" />
            <div className="h-10 w-2/3 rounded bg-[var(--color-surface-2)]" />
            <div className="h-3 w-1/4 rounded bg-[var(--color-surface-2)]" />
          </div>
        </div>
        <div className="mt-10 space-y-1">
          <TrackRowSkeleton />
          <TrackRowSkeleton />
          <TrackRowSkeleton />
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-24 place-items-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/40 to-[var(--color-accent-2)]/40 shadow-[var(--shadow-card)] sm:size-28">
            <ListMusic size={36} className="text-white/30" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
              Playlist
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{pl.name}</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {pl.tracks.length} {pl.tracks.length === 1 ? 'track' : 'tracks'} ·{' '}
              {pl.isPublic ? 'Public' : 'Private'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {pl.tracks.length > 0 && (
            <Button
              variant="primary"
              onClick={() => playTrack(pl.tracks[0]!, pl.tracks)}
              className="gap-1.5"
            >
              <Play size={14} className="fill-current" />
              Play
            </Button>
          )}
          {isOwner && (
            <Button variant="ghost" onClick={deletePlaylist} className="gap-1.5">
              <Trash2 size={14} />
              Delete
            </Button>
          )}
        </div>
      </header>

      {pl.tracks.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-16 text-center text-sm text-[var(--color-text-muted)]">
          Empty for now. Find tracks on Discover and add them here.
        </div>
      ) : (
        <div className="mt-10">
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext
              items={pl.tracks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5">
                {pl.tracks.map((t, i) => (
                  <SortableTrack
                    key={t.id}
                    track={t}
                    index={i}
                    queue={pl.tracks}
                    canEdit={Boolean(isOwner)}
                    onRemove={() => removeTrack(t.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </main>
  );
}

function SortableTrack({
  track,
  index,
  queue,
  canEdit,
  onRemove,
}: {
  track: Track;
  index: number;
  queue: Track[];
  canEdit: boolean;
  onRemove: () => void;
}) {
  const playTrack = usePlayer((s) => s.playTrack);
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isCurrent = current?.id === track.id;
  const showBars = isCurrent && isPlaying;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => (isCurrent ? setIsPlaying(!isPlaying) : playTrack(track, queue))}
      className={cn(
        'group grid cursor-pointer grid-cols-[20px_24px_auto_1fr_auto] items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--color-surface-2)]',
        isCurrent && 'bg-[var(--color-surface-2)]',
      )}
    >
      {canEdit ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Reorder"
          className="grid size-5 cursor-grab place-items-center rounded text-[var(--color-text-subtle)] opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>
      ) : (
        <span />
      )}
      <div className="flex h-6 w-6 items-center justify-center text-sm tabular-nums text-[var(--color-text-subtle)]">
        {showBars ? (
          <span className="now-playing-bars">
            <span /><span /><span />
          </span>
        ) : (
          index + 1
        )}
      </div>
      {track.coverUrl ? (
        <img src={track.coverUrl} alt="" className="size-10 rounded object-cover" />
      ) : (
        <div className="size-10 rounded bg-[var(--color-surface-3)]" />
      )}
      <div className="min-w-0">
        <div
          className={cn(
            'truncate text-sm font-medium',
            isCurrent && 'text-[var(--color-accent)]',
          )}
        >
          {track.title}
        </div>
        <div className="truncate text-xs text-[var(--color-text-muted)]">{track.artist}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <LikeButton trackId={track.id} track={track} size="sm" />
        <span className="hidden w-12 text-right text-xs tabular-nums text-[var(--color-text-muted)] sm:inline">
          {fmtTime(track.durationSec)}
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove from playlist"
            className="grid size-8 place-items-center rounded-full text-[var(--color-text-muted)] opacity-0 transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-danger)] group-hover:opacity-100"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}