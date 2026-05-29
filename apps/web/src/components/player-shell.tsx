'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '@/lib/player-store';

// The persistent player. A single <audio> element lives here and survives
// route transitions because this component mounts in the root layout.
// Player state (current track, queue, isPlaying, position) is held in a
// Zustand store so any component can read or drive it.
export function PlayerShell() {
  const { current, isPlaying, setIsPlaying, setPosition, next } = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hidden, setHidden] = useState(false);

  // Hide ourselves while a /rooms/:code page is mounted — that page owns the
  // audio element. Two players competing for output is the worst kind of bug.
  useEffect(() => {
    const update = () => setHidden(document.body.dataset.inRoom === '1');
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-in-room'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!current || hidden) {
      el.pause();
      return;
    }
    if (el.src !== current.audioUrl) el.src = current.audioUrl;
    if (isPlaying) el.play().catch(() => setIsPlaying(false));
    else el.pause();
  }, [current, isPlaying, setIsPlaying, hidden]);

  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {current?.coverUrl ? (
            <img
              src={current.coverUrl}
              alt=""
              className="size-12 rounded-md object-cover"
            />
          ) : (
            <div className="size-12 rounded-md bg-[var(--color-surface-2)]" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {current?.title ?? 'Nothing playing'}
            </div>
            <div className="truncate text-xs text-[var(--color-muted)]">
              {current?.artist ?? 'Pick a track to start'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!current}
            className="grid size-10 place-items-center rounded-full bg-[var(--color-text)] text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
        </div>

        <div className="hidden flex-1 sm:block" />
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onEnded={() => next()}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}
