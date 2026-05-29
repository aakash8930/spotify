'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiSend, useApi } from '@/lib/api';

type RoomListItem = {
  id: string;
  code: string;
  name: string;
  hostUsername: string;
  memberCount: number;
  nowPlaying: { title: string; artist: string } | null;
};

export default function RoomsLobbyPage() {
  const router = useRouter();
  const { data, loading } = useApi('/api/rooms', (k) => apiGet<{ rooms: RoomListItem[] }>(k));
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiSend<{ room: { code: string } }>('/api/rooms', 'POST', {
        name,
        isPublic: true,
      });
      router.push(`/rooms/${res.room.code}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    router.push(`/rooms/${code.trim().toUpperCase()}`);
  };

  const rooms = data?.rooms ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Listening rooms</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Synced playback for everyone in the room. Live chat included.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <form onSubmit={create} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-medium">Start a new room</h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            You’ll be the host. Share the 6-char code so anyone can join.
          </p>
          <input
            placeholder="Room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2"
          />
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="mt-4 w-full rounded-lg bg-[var(--color-accent)] py-2 text-sm font-medium text-black disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create room'}
          </button>
        </form>

        <form onSubmit={join} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-medium">Join with a code</h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Got a 6-char code from a friend? Drop it here.
          </p>
          <input
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="mt-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 font-mono uppercase tracking-widest"
          />
          <button
            type="submit"
            disabled={code.trim().length < 4}
            className="mt-4 w-full rounded-lg border border-[var(--color-border)] py-2 text-sm font-medium hover:bg-[var(--color-surface-2)] disabled:opacity-60"
          >
            Join room
          </button>
        </form>
      </div>

      <h2 className="mt-12 text-lg font-medium">Public rooms</h2>
      {loading && rooms.length === 0 && (
        <p className="mt-6 text-sm text-[var(--color-muted)]">Loading…</p>
      )}
      {!loading && rooms.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-muted)]">
          No public rooms right now. Be the first.
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => (
          <Link
            key={r.id}
            href={`/rooms/${r.code}`}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:bg-[var(--color-surface-2)]"
          >
            <div className="flex items-center justify-between">
              <h3 className="truncate font-medium">{r.name}</h3>
              <span className="font-mono text-xs text-[var(--color-muted)]">{r.code}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted)]">hosted by @{r.hostUsername}</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-[var(--color-muted)]">
                {r.memberCount} listening
              </span>
              {r.nowPlaying ? (
                <span className="truncate text-[var(--color-accent)]">
                  ▶ {r.nowPlaying.title}
                </span>
              ) : (
                <span className="text-[var(--color-muted)]">idle</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
