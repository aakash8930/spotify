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
import type { PlaylistWithTracks } from '@resonate/shared/playlists';
import type { Track } from '@resonate/shared/tracks';
import { apiGet, apiSend, invalidate } from '@/lib/api';
import { usePlayer } from '@/lib/player-store';
import { useAuth } from '@/components/auth-provider';
import { LikeButton } from '@/components/like-button';

export default function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const playTrack = usePlayer((s) => s.playTrack);
  const [pl, setPl] = useState<PlaylistWithTracks | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ playlist: PlaylistWithTracks }>(`/api/playlists/${id}`)
      .then((r) => setPl(r.playlist))
      .catch((e) => setError((e as Error).message));
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
    await apiSend(`/api/playlists/${id}/order`, 'PUT', {
      trackIds: next.map((t) => t.id),
    });
  };

  const removeTrack = async (trackId: string) => {
    if (!pl) return;
    setPl({ ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) });
    await apiSend(`/api/playlists/${id}/tracks/${trackId}`, 'DELETE');
    invalidate('/api/playlists');
  };

  const deletePlaylist = async () => {
    if (!confirm(`Delete "${pl?.name}"? This cannot be undone.`)) return;
    await apiSend(`/api/playlists/${id}`, 'DELETE');
    invalidate('/api/playlists');
    router.push('/playlists');
  };

  if (error) return <main className="mx-auto max-w-5xl px-6 py-12 text-sm text-red-400">{error}</main>;
  if (!pl) return <main className="mx-auto max-w-5xl px-6 py-12 text-sm text-[var(--color-muted)]">Loading…</main>;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Playlist</span>
          <h1 className="mt-1 text-4xl font-bold tracking-tight">{pl.name}</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{pl.tracks.length} tracks</p>
        </div>
        <div className="flex gap-2">
          {pl.tracks.length > 0 && (
            <button
              type="button"
              onClick={() => playTrack(pl.tracks[0]!, pl.tracks)}
              className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-black"
            >
              Play
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={deletePlaylist}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>
      </header>

      {pl.tracks.length === 0 ? (
        <p className="mt-16 rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center text-sm text-[var(--color-muted)]">
          Empty for now. Find tracks on Discover and add them here.
        </p>
      ) : (
        <div className="mt-8">
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext items={pl.tracks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isCurrent = current?.id === track.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => playTrack(track, queue)}
      className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-[var(--color-surface)] ${
        isCurrent ? 'bg-[var(--color-surface)]' : ''
      }`}
    >
      {canEdit && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="Reorder"
          className="cursor-grab text-[var(--color-muted)] active:cursor-grabbing"
        >
          ⋮⋮
        </button>
      )}
      <div className="w-6 shrink-0 text-center text-sm text-[var(--color-muted)]">{index + 1}</div>
      {track.coverUrl ? (
        <img src={track.coverUrl} alt="" className="size-10 rounded object-cover" />
      ) : (
        <div className="size-10 rounded bg-[var(--color-surface-2)]" />
      )}
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm font-medium ${isCurrent ? 'text-[var(--color-accent)]' : ''}`}
        >
          {track.title}
        </div>
        <div className="truncate text-xs text-[var(--color-muted)]">{track.artist}</div>
      </div>
      <LikeButton trackId={track.id} size="sm" />
      <span className="w-12 text-right text-sm tabular-nums text-[var(--color-muted)]">
        {fmt(track.durationSec)}
      </span>
      {canEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove from playlist"
          className="ml-2 text-[var(--color-muted)] hover:text-red-400"
        >
          ✕
        </button>
      )}
    </div>
  );
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
};
