'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayer } from '@/lib/player-store';
import { cn, fmtTime } from '@/lib/utils';

// The persistent player. A single <audio> element lives here and survives
// route transitions because this component mounts in the root layout.
// Player state (current track, queue, isPlaying, position) is held in a
// Zustand store so any component can read or drive it.
export function PlayerShell() {
  const current = usePlayer((s) => s.current);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const positionSec = usePlayer((s) => s.positionSec);
  const durationSec = usePlayer((s) => s.durationSec);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const setIsPlaying = usePlayer((s) => s.setIsPlaying);
  const setPosition = usePlayer((s) => s.setPosition);
  const setDuration = usePlayer((s) => s.setDuration);
  const seekTo = usePlayer((s) => s.seekTo);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const consumeSeek = usePlayer((s) => s.consumeSeek);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hidden = useInRoom();

  // Sync audio element with store state.
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

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Pull pending seek requests from the store and apply to the audio element.
  // We keep seeks out of the React state→audio attribute pipeline because
  // setting currentTime fires `seeked` which would create a feedback loop.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const target = consumeSeek();
    if (target !== null) el.currentTime = target;
  }, [positionSec, consumeSeek]);

  // Keyboard shortcuts: space toggles play, arrows skip, m mutes. Skip if
  // the focus is in an editable element so chat/search aren't hijacked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (
        tgt?.tagName === 'INPUT' ||
        tgt?.tagName === 'TEXTAREA' ||
        tgt?.isContentEditable
      ) {
        return;
      }
      if (!current) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === 'ArrowRight' && e.shiftKey) {
        next();
      } else if (e.code === 'ArrowLeft' && e.shiftKey) {
        prev();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, isPlaying, setIsPlaying, next, prev, toggleMute]);

  if (hidden) return null;

  const dur = durationSec || current?.durationSec || 0;
  const pct = dur ? (positionSec / dur) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)]">
      {/* Mobile-only top progress strip. On md+ the slider lives in the
          center column with timestamps, so this is hidden. */}
      <div className="md:hidden">
        <input
          type="range"
          min={0}
          max={Math.max(dur, 1)}
          step={0.1}
          value={Math.min(positionSec, dur)}
          disabled={!current}
          onChange={(e) => seekTo(Number(e.target.value))}
          aria-label="Seek"
          className="range-slim w-full"
          style={{ ['--range-pct' as string]: `${pct}%` }}
        />
      </div>

      <div className="mx-auto grid h-20 max-w-[1600px] grid-cols-[1fr_auto] items-center gap-3 px-3 sm:gap-6 sm:px-6 md:grid-cols-3">
        {/* Left: now-playing meta */}
        <div className="flex min-w-0 items-center gap-3">
          {current?.coverUrl ? (
            <img
              src={current.coverUrl}
              alt=""
              className="size-12 shrink-0 rounded-md object-cover shadow-md sm:size-14"
            />
          ) : (
            <div className="grid size-12 shrink-0 place-items-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-text-subtle)] sm:size-14">
              ♪
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium leading-tight">
              {current?.title ?? 'Nothing playing'}
            </div>
            <div className="truncate text-xs text-[var(--color-text-muted)]">
              {current?.artist ?? 'Pick a track to start'}
            </div>
          </div>
        </div>

        {/* Center: transport + slider */}
        <div className="flex flex-col items-stretch gap-1 md:items-center">
          <div className="flex items-center justify-end gap-1 md:justify-center md:gap-2">
            <IconBtn
              ariaLabel="Toggle shuffle"
              onClick={toggleShuffle}
              active={shuffle}
              className="hidden md:inline-flex"
            >
              <Shuffle size={16} />
            </IconBtn>
            <IconBtn ariaLabel="Previous" onClick={prev} disabled={!current}>
              <SkipBack size={18} className="fill-current" />
            </IconBtn>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!current}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="grid size-10 place-items-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)] transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPlaying ? (
                <Pause size={18} className="fill-current" />
              ) : (
                <Play size={18} className="ml-0.5 fill-current" />
              )}
            </button>
            <IconBtn ariaLabel="Next" onClick={next} disabled={!current}>
              <SkipForward size={18} className="fill-current" />
            </IconBtn>
            <IconBtn
              ariaLabel="Cycle repeat"
              onClick={cycleRepeat}
              active={repeat !== 'off'}
              className="hidden md:inline-flex"
            >
              {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </IconBtn>
          </div>

          {/* Desktop: thin slider with timestamps */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="w-10 text-right text-[11px] tabular-nums text-[var(--color-text-muted)]">
              {fmtTime(positionSec)}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(dur, 1)}
              step={0.1}
              value={Math.min(positionSec, dur)}
              disabled={!current}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek"
              className="range-slim w-full max-w-[36rem] flex-1"
              style={{ ['--range-pct' as string]: `${pct}%` }}
            />
            <span className="w-10 text-[11px] tabular-nums text-[var(--color-text-muted)]">
              {fmtTime(dur)}
            </span>
          </div>
        </div>

        {/* Right: volume — desktop only, mobile uses the top progress strip */}
        <div className="hidden items-center justify-end gap-2 md:flex">
          <IconBtn ariaLabel={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
            <VolumeIcon size={16} />
          </IconBtn>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="range-slim w-28"
            style={{ ['--range-pct' as string]: `${(muted ? 0 : volume) * 100}%` }}
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        onLoadedMetadata={(e) => {
          if (Number.isFinite(e.currentTarget.duration)) {
            setDuration(e.currentTarget.duration);
          }
        }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onEnded={() => next()}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  ariaLabel,
  disabled,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        'grid size-9 place-items-center rounded-full transition hover:bg-[var(--color-surface-2)] disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
        className,
      )}
    >
      {children}
    </button>
  );
}

// Watch a body data attribute so the room page can hide us while it owns
// the audio element. We don't want two players competing for output.
function useInRoom(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.body.dataset.inRoom === '1');
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-in-room'] });
    return () => observer.disconnect();
  }, []);
  return hidden;
}
