'use client';

import { Play } from 'lucide-react';
import type { Track } from '@resonate/shared/tracks';
import { usePlayer } from '@/lib/player-store';
import { cn, fmtTime } from '@/lib/utils';
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
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const { user } = useAuth();
  const isCurrent = current?.id === track.id;
  const showPause = isCurrent && isPlaying;

  const handlePlay = () => {
    if (isCurrent) setIsPlaying(!isPlaying);
    else playTrack(track, queue);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handlePlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePlay();
        }
      }}
      className={cn(
        'group grid cursor-pointer grid-cols-[24px_auto_1fr_auto] items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--color-surface-2)] sm:gap-4',
        isCurrent && 'bg-[var(--color-surface-2)]',
      )}
    >
      <div className="relative flex h-6 w-6 items-center justify-center text-sm tabular-nums text-[var(--color-text-subtle)]">
        {showPause ? (
          <span className="now-playing-bars" aria-label="Now playing">
            <span /><span /><span />
          </span>
        ) : (
          <>
            <span className="group-hover:hidden">{index + 1}</span>
            <Play
              size={14}
              className="hidden fill-current group-hover:block"
              aria-hidden
            />
          </>
        )}
      </div>

      {track.coverUrl ? (
        <img
          src={track.coverUrl}
          alt=""
          loading="lazy"
          className="size-10 rounded object-cover"
        />
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

      <div className="flex items-center gap-1 sm:gap-2">
        <span className="hidden rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)] md:inline">
          {track.source === 'JAMENDO' ? 'Jamendo' : track.source === 'SAAVN' ? 'Saavn' : 'Upload'}
        </span>
        <LikeButton trackId={track.id} track={track} initial={initialLiked} size="sm" />
        {user && <AddToPlaylist trackId={track.id} />}
        <span className="hidden w-12 text-right text-xs tabular-nums text-[var(--color-text-muted)] sm:inline">
          {fmtTime(track.durationSec)}
        </span>
        {trailing}
      </div>
    </div>
  );
}
