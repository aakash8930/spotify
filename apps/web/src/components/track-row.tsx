'use client';

import type { Track } from '@resonate/shared/tracks';
import { usePlayer } from '@/lib/player-store';
import { LikeButton } from './like-button';
import { AddToPlaylist } from './add-to-playlist';
import { useAuth } from './auth-provider';

export function TrackRow({
  track,
  index,
  queue,
  trailing,
  initialLiked,
}: {
  track: Track;
  index: number;
  queue: Track[];
  trailing?: React.ReactNode;
  initialLiked?: boolean;
}) {
  const playTrack = usePlayer((s) => s.playTrack);
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const { user } = useAuth();
  const isCurrent = current?.id === track.id;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => playTrack(track, queue)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playTrack(track, queue);
        }
      }}
      className={`group flex cursor-pointer items-center gap-4 rounded-lg p-2 transition hover:bg-[var(--color-surface)] ${
        isCurrent ? 'bg-[var(--color-surface)]' : ''
      }`}
    >
      <div className="w-6 shrink-0 text-center text-sm text-[var(--color-muted)]">
        {isCurrent && isPlaying ? <span className="text-[var(--color-accent)]">▶</span> : index + 1}
      </div>
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
      <span className="hidden rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)] sm:inline">
        {track.source === 'JAMENDO' ? 'Jamendo' : 'Upload'}
      </span>
      <LikeButton trackId={track.id} track={track} initial={initialLiked} size="sm" />
      {user && <AddToPlaylist trackId={track.id} />}
      <span className="w-12 text-right text-sm tabular-nums text-[var(--color-muted)]">
        {fmt(track.durationSec)}
      </span>
      {trailing}
    </div>
  );
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
};
