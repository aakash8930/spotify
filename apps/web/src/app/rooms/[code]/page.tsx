'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  Pause,
  Play,
  Search,
  Send,
  SkipForward,
  Users,
  X,
} from 'lucide-react';
import type { Track } from '@resonate/shared/tracks';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { computeLivePosition, useRoom } from '@/lib/room-store';
import { cn, fmtTime } from '@/lib/utils';

// Drift threshold in seconds. Below this we let local playback continue —
// re-seeking constantly causes audible glitches. Above this we snap to the
// server's truth.
const DRIFT_THRESHOLD = 0.25;

type ChatMsg = {
  id: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string;
};

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user, loading: authLoading } = useAuth();
  const room = useRoom((s) => s.room);
  const playback = useRoom((s) => s.playback);
  const members = useRoom((s) => s.members);
  const error = useRoom((s) => s.error);
  const join = useRoom((s) => s.join);
  const leave = useRoom((s) => s.leave);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Tag the body so the global PlayerShell can hide itself — the room owns
  // the audio element while it's mounted.
  useEffect(() => {
    document.body.dataset.inRoom = '1';
    return () => {
      delete document.body.dataset.inRoom;
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setJoinError('Log in to join a room');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const upper = code.toUpperCase();
        const meta = await apiGet<{ room: { id: string } }>(`/api/rooms/by-code/${upper}`);
        const history = await apiGet<{ messages: ChatMsg[] }>(
          `/api/rooms/${meta.room.id}/messages`,
        );
        if (cancelled) return;
        await join(upper, history.messages);
      } catch (e) {
        if (!cancelled) setJoinError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      leave();
    };
  }, [code, user, authLoading, join, leave]);

  if (authLoading) return <Centered>Loading…</Centered>;
  if (!user)
    return (
      <Centered>
        <p className="text-sm text-[var(--color-text-muted)]">
          You need an account to join a room.
        </p>
        <Link href="/login" className="mt-4">
          <Button variant="primary">Log in</Button>
        </Link>
      </Centered>
    );
  if (joinError) return <Centered>{joinError}</Centered>;
  if (!room || !playback) return <Centered>Connecting to room…</Centered>;

  const isHost = members.some((m) => m.userId === user.id && m.isHost);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/rooms"
            className="grid size-9 place-items-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
            aria-label="Back to rooms"
          >
            <X size={16} />
          </Link>
          <div>
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-subtle)]">
              Room
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{room.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CodeChip code={room.code} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
            <Users size={12} />
            {members.length}
          </span>
          {error && (
            <span className="rounded-md bg-[var(--color-danger)]/10 px-2 py-1 text-xs text-[var(--color-danger)]">
              {error}
            </span>
          )}
        </div>
      </header>

      <NowPlaying isHost={isHost} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Queue isHost={isHost} />
          <AddTracks isHost={isHost} />
        </div>
        <div className="space-y-6">
          <Members hostId={room.hostId} />
          <Chat />
        </div>
      </div>
    </main>
  );
}

const Centered = ({ children }: { children: React.ReactNode }) => (
  <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
    {children}
  </main>
);

function CodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(code).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-mono text-sm tracking-widest hover:bg-[var(--color-surface-2)]"
      aria-label="Copy room code"
    >
      {copied ? (
        <>
          <Check size={12} className="text-[var(--color-accent)]" />
          copied
        </>
      ) : (
        <>
          {code}
          <Copy size={12} className="text-[var(--color-text-subtle)]" />
        </>
      )}
    </button>
  );
}

function NowPlaying({ isHost }: { isHost: boolean }) {
  const playback = useRoom((s) => s.playback)!;
  const offset = useRoom((s) => s.clockOffsetMs);
  const hostPlay = useRoom((s) => s.hostPlay);
  const hostPause = useRoom((s) => s.hostPause);
  const hostSeek = useRoom((s) => s.hostSeek);
  const next = useRoom((s) => s.next);
  const trackEnded = useRoom((s) => s.trackEnded);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [livePos, setLivePos] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (!playback.current) {
      el.pause();
      el.removeAttribute('src');
      return;
    }
    if (el.src !== playback.current.audioUrl) {
      el.src = playback.current.audioUrl;
      el.currentTime = computeLivePosition(playback, offset);
    }

    const target = computeLivePosition(playback, offset);
    if (Math.abs(el.currentTime - target) > DRIFT_THRESHOLD) {
      el.currentTime = target;
    }

    if (playback.isPlaying) {
      el.play().catch(() => {
        // Browsers block autoplay until first interaction.
      });
    } else {
      el.pause();
    }
  }, [playback, offset]);

  useEffect(() => {
    const t = setInterval(() => setLivePos(computeLivePosition(playback, offset)), 250);
    return () => clearInterval(t);
  }, [playback, offset]);

  const t = playback.current;
  const dur = t?.durationSec ?? 0;
  const pct = dur ? Math.min(100, (livePos / dur) * 100) : 0;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      <div className="relative">
        {/* Soft gradient backdrop. When the cover loads it bleeds through
            the blurred copy in the background. */}
        {t?.coverUrl && (
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              backgroundImage: `url(${t.coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(80px) saturate(1.4)',
              transform: 'scale(1.4)',
            }}
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--color-surface)]/85 to-[var(--color-surface)]/95" />

        <div className="flex flex-col items-center gap-6 p-6 md:flex-row md:items-end md:p-8">
          {t?.coverUrl ? (
            <img
              src={t.coverUrl}
              alt=""
              className="size-44 shrink-0 rounded-2xl object-cover shadow-[var(--shadow-elevated)]"
            />
          ) : (
            <div className="grid size-44 shrink-0 place-items-center rounded-2xl bg-[var(--color-surface-2)] text-4xl text-[var(--color-text-subtle)]">
              ♪
            </div>
          )}
          <div className="min-w-0 flex-1 text-center md:text-left">
            <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              {playback.isPlaying ? 'Playing now' : t ? 'Paused' : 'Nothing playing'}
            </div>
            <div className="mt-1 truncate text-2xl font-bold md:text-3xl">
              {t?.title ?? 'Queue is empty'}
            </div>
            <div className="truncate text-sm text-[var(--color-text-muted)]">
              {t?.artist ?? 'Add a track from below to start the room'}
            </div>

            <div
              role={isHost ? 'slider' : undefined}
              aria-valuemin={0}
              aria-valuemax={dur}
              aria-valuenow={Math.floor(livePos)}
              onClick={(e) => {
                if (!isHost || !t) return;
                const r = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - r.left) / r.width;
                hostSeek(ratio * dur);
              }}
              className={cn(
                'mt-6 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]',
                isHost && t && 'cursor-pointer',
              )}
            >
              <div
                className="h-full rounded-full bg-[var(--color-text)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-[var(--color-text-muted)]">
              <span>{fmtTime(livePos)}</span>
              <span>{fmtTime(dur)}</span>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 md:justify-start">
              {isHost ? (
                <>
                  <button
                    type="button"
                    onClick={() => (playback.isPlaying ? hostPause() : hostPlay())}
                    disabled={!t}
                    aria-label={playback.isPlaying ? 'Pause' : 'Play'}
                    className="grid size-12 place-items-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)] transition hover:scale-105 active:scale-95 disabled:opacity-40"
                  >
                    {playback.isPlaying ? (
                      <Pause size={20} className="fill-current" />
                    ) : (
                      <Play size={20} className="ml-0.5 fill-current" />
                    )}
                  </button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => next()}
                    disabled={playback.queue.length === 0}
                    className="gap-1.5"
                  >
                    <SkipForward size={14} />
                    Skip
                  </Button>
                </>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Only the host controls playback.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        onEnded={() => {
          if (isHost) trackEnded();
        }}
      />
    </section>
  );
}

function Queue({ isHost }: { isHost: boolean }) {
  const playback = useRoom((s) => s.playback)!;
  const setTrack = useRoom((s) => s.setTrack);
  const removeFromQueue = useRoom((s) => s.removeFromQueue);

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
        Up next ({playback.queue.length})
      </h2>
      {playback.queue.length === 0 ? (
        <p className="px-2 py-6 text-sm text-[var(--color-text-muted)]">
          Queue is empty. Add tracks from the search below.
        </p>
      ) : (
        <ul className="mt-2 space-y-0.5">
          {playback.queue.map((t, i) => (
            <li
              key={t.id}
              className="group flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--color-surface-2)]"
            >
              <span className="w-6 text-center text-xs tabular-nums text-[var(--color-text-subtle)]">
                {i + 1}
              </span>
              {t.coverUrl ? (
                <img src={t.coverUrl} alt="" className="size-10 rounded object-cover" />
              ) : (
                <div className="size-10 rounded bg-[var(--color-surface-3)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.title}</div>
                <div className="truncate text-xs text-[var(--color-text-muted)]">{t.artist}</div>
              </div>
              {isHost && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTrack(t)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    Play now
                  </Button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(t.id)}
                    aria-label="Remove from queue"
                    className="grid size-7 place-items-center rounded-full text-[var(--color-text-muted)] opacity-0 transition hover:bg-[var(--color-surface-3)] hover:text-[var(--color-danger)] group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddTracks({ isHost }: { isHost: boolean }) {
  const enqueue = useRoom((s) => s.enqueue);
  const setTrack = useRoom((s) => s.setTrack);
  const playback = useRoom((s) => s.playback)!;
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tracks/search?q=${encodeURIComponent(q)}`, {
          credentials: 'include',
          signal: ctrl.signal,
        });
        const data = (await res.json()) as { tracks: Track[] };
        setResults(data.tracks);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
        Add tracks
      </h2>
      <div className="relative mt-2">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
        />
        <input
          placeholder="Search for something to play…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-accent)]"
        />
      </div>
      <div className="mt-3 max-h-80 space-y-0.5 overflow-y-auto">
        {loading && results.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">Searching…</p>
        )}
        {results.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--color-surface-2)]"
          >
            {t.coverUrl ? (
              <img src={t.coverUrl} alt="" className="size-10 rounded object-cover" />
            ) : (
              <div className="size-10 rounded bg-[var(--color-surface-3)]" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t.title}</div>
              <div className="truncate text-xs text-[var(--color-text-muted)]">{t.artist}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => enqueue(t)}>
              Queue
            </Button>
            {isHost && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => (playback.current ? enqueue(t) : setTrack(t))}
              >
                {playback.current ? 'Add' : 'Play'}
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Members({ hostId }: { hostId: string }) {
  const members = useRoom((s) => s.members);
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
        Listening ({members.length})
      </h2>
      <ul className="mt-2 space-y-0.5">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm"
          >
            <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] text-xs font-semibold text-[var(--color-accent-fg)]">
              {(m.displayName ?? m.username).slice(0, 1).toUpperCase()}
            </div>
            <span className="min-w-0 truncate">{m.displayName ?? m.username}</span>
            {m.userId === hostId && (
              <span className="ml-auto rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-accent)]">
                host
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Chat() {
  const chat = useRoom((s) => s.chat);
  const sendChat = useRoom((s) => s.sendChat);
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setBody('');
  };

  return (
    <section className="flex h-[420px] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
        Chat
      </h2>
      <div ref={scrollRef} className="mt-2 flex-1 space-y-2 overflow-y-auto px-2 py-1">
        {chat.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
            Say hi.
          </p>
        )}
        {chat.map((m) => (
          <div key={m.id} className="text-sm leading-relaxed">
            <span className="font-medium text-[var(--color-accent)]">{m.username}</span>{' '}
            <span className="break-words text-[var(--color-text)]">{m.body}</span>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          placeholder="Message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          aria-label="Send message"
          className="grid size-9 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] transition hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </form>
    </section>
  );
}