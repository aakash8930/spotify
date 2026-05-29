'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Track } from '@resonate/shared/tracks';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { computeLivePosition, useRoom } from '@/lib/room-store';

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
        // Fetch chat history first (REST) so users see prior messages
        // immediately on join. Without this the chat looks empty until
        // someone sends the first message after they joined.
        const meta = await apiGet<{ room: { id: string } }>(`/api/rooms/by-code/${upper}`);
        const history = await apiGet<{ messages: ChatMsg[] }>(`/api/rooms/${meta.room.id}/messages`);
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
        <p className="text-sm text-[var(--color-muted)]">You need an account to join a room.</p>
        <Link
          href={`/login`}
          className="mt-4 rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-black"
        >
          Log in
        </Link>
      </Centered>
    );
  if (joinError) return <Centered>{joinError}</Centered>;
  if (!room || !playback) return <Centered>Connecting to room…</Centered>;

  const isHost = members.some((m) => m.userId === user.id && m.isHost);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">Room</span>
          <h1 className="text-3xl font-bold tracking-tight">{room.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <CodeChip code={room.code} />
          <span className="text-xs text-[var(--color-muted)]">{members.length} listening</span>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </header>

      <NowPlaying isHost={isHost} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
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
      className="rounded-full border border-[var(--color-border)] px-3 py-1 font-mono text-sm tracking-widest hover:bg-[var(--color-surface-2)]"
    >
      {copied ? 'copied' : code}
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

  // Sync local <audio> to server-authoritative state. We re-seek only when
  // drift exceeds the threshold so that healthy playback isn't constantly
  // glitching. The server's anchor + clock-offset gives us the canonical
  // playhead.
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
      // New track: align immediately, no drift threshold.
      el.currentTime = computeLivePosition(playback, offset);
    }

    const target = computeLivePosition(playback, offset);
    if (Math.abs(el.currentTime - target) > DRIFT_THRESHOLD) {
      el.currentTime = target;
    }

    if (playback.isPlaying) {
      el.play().catch(() => {
        // Browsers block autoplay until first interaction; the play button
        // below gives the user a way to unblock it. The state stays correct
        // server-side, we just won't make sound until they click.
      });
    } else {
      el.pause();
    }
  }, [playback, offset]);

  // Drive a smooth progress bar locally — recompute every 250ms instead of
  // waiting for server emits.
  useEffect(() => {
    const t = setInterval(() => setLivePos(computeLivePosition(playback, offset)), 250);
    return () => clearInterval(t);
  }, [playback, offset]);

  const t = playback.current;
  const dur = t?.durationSec ?? 0;
  const pct = dur ? Math.min(100, (livePos / dur) * 100) : 0;

  return (
    <section className="mt-8 flex flex-col items-center gap-6 rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-6 md:flex-row md:items-end md:p-8">
      {t?.coverUrl ? (
        <img src={t.coverUrl} alt="" className="size-44 shrink-0 rounded-2xl object-cover shadow-2xl" />
      ) : (
        <div className="grid size-44 shrink-0 place-items-center rounded-2xl bg-[var(--color-surface-2)] text-4xl">
          ♪
        </div>
      )}
      <div className="min-w-0 flex-1 text-center md:text-left">
        <div className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
          {playback.isPlaying ? 'Playing now' : t ? 'Paused' : 'Nothing playing'}
        </div>
        <div className="mt-1 truncate text-2xl font-bold">{t?.title ?? 'Queue is empty'}</div>
        <div className="truncate text-sm text-[var(--color-muted)]">
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
          className={`mt-6 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)] ${
            isHost && t ? 'cursor-pointer' : ''
          }`}
        >
          <div
            className="h-full bg-[var(--color-accent)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs tabular-nums text-[var(--color-muted)]">
          <span>{fmt(livePos)}</span>
          <span>{fmt(dur)}</span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 md:justify-start">
          {isHost ? (
            <>
              <button
                type="button"
                onClick={() => (playback.isPlaying ? hostPause() : hostPlay())}
                disabled={!t}
                className="grid size-12 place-items-center rounded-full bg-[var(--color-accent)] text-black transition hover:scale-105 disabled:opacity-50"
              >
                {playback.isPlaying ? '❚❚' : '▶'}
              </button>
              <button
                type="button"
                onClick={() => next()}
                disabled={playback.queue.length === 0}
                className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-surface-2)] disabled:opacity-40"
              >
                Skip
              </button>
            </>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">Only the host controls playback.</p>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        onEnded={() => {
          // Only the host's tab tells the server the track ended. We can't
          // distinguish host from non-host on the server side without state,
          // so the gateway gates this with withHostState.
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
      <h2 className="px-2 text-sm font-medium uppercase tracking-wider text-[var(--color-muted)]">
        Up next ({playback.queue.length})
      </h2>
      {playback.queue.length === 0 ? (
        <p className="px-2 py-6 text-sm text-[var(--color-muted)]">
          Queue is empty. Add tracks from the search below.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {playback.queue.map((t, i) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--color-surface-2)]"
            >
              <span className="w-6 text-center text-sm text-[var(--color-muted)]">{i + 1}</span>
              {t.coverUrl ? (
                <img src={t.coverUrl} alt="" className="size-10 rounded object-cover" />
              ) : (
                <div className="size-10 rounded bg-[var(--color-surface-2)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.title}</div>
                <div className="truncate text-xs text-[var(--color-muted)]">{t.artist}</div>
              </div>
              {isHost && (
                <>
                  <button
                    type="button"
                    onClick={() => setTrack(t)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs hover:bg-[var(--color-surface)]"
                  >
                    Play now
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(t.id)}
                    aria-label="Remove from queue"
                    className="text-[var(--color-muted)] hover:text-red-400"
                  >
                    ✕
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
      <h2 className="px-2 text-sm font-medium uppercase tracking-wider text-[var(--color-muted)]">
        Add tracks
      </h2>
      <input
        placeholder="Search for something to play…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2"
      />
      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {loading && results.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--color-muted)]">Searching…</p>
        )}
        {results.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--color-surface-2)]"
          >
            {t.coverUrl ? (
              <img src={t.coverUrl} alt="" className="size-10 rounded object-cover" />
            ) : (
              <div className="size-10 rounded bg-[var(--color-surface-2)]" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t.title}</div>
              <div className="truncate text-xs text-[var(--color-muted)]">{t.artist}</div>
            </div>
            <button
              type="button"
              onClick={() => enqueue(t)}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs hover:bg-[var(--color-surface)]"
            >
              Queue
            </button>
            {isHost && (
              <button
                type="button"
                onClick={() => (playback.current ? enqueue(t) : setTrack(t))}
                className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-black"
              >
                {playback.current ? '+' : 'Play'}
              </button>
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
      <h2 className="px-2 text-sm font-medium uppercase tracking-wider text-[var(--color-muted)]">
        Listening ({members.length})
      </h2>
      <ul className="mt-2 space-y-1">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm"
          >
            <div className="grid size-7 place-items-center rounded-full bg-[var(--color-surface-2)] text-xs">
              {(m.displayName ?? m.username).slice(0, 1).toUpperCase()}
            </div>
            <span className="truncate">{m.displayName ?? m.username}</span>
            {m.userId === hostId && (
              <span className="ml-auto rounded-full bg-[var(--color-accent)]/20 px-2 py-0.5 text-xs text-[var(--color-accent)]">
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
      <h2 className="px-2 text-sm font-medium uppercase tracking-wider text-[var(--color-muted)]">
        Chat
      </h2>
      <div ref={scrollRef} className="mt-2 flex-1 space-y-2 overflow-y-auto px-2">
        {chat.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--color-muted)]">Say hi.</p>
        )}
        {chat.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-medium text-[var(--color-accent)]">{m.username}</span>{' '}
            <span className="break-words">{m.body}</span>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          placeholder="Message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </section>
  );
}

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
};
