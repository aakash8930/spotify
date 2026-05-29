'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Radio, Sparkles, Users } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
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

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const res = await apiSend<{ room: { code: string } }>('/api/rooms', 'POST', {
        name,
        isPublic: true,
      });
      router.push(`/rooms/${res.room.code}`);
    } catch (err) {
      toast.error('Could not create room', { description: (err as Error).message });
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
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
          <Radio size={20} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Listening rooms</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Synced playback for everyone in the room. Live chat included.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <form
          onSubmit={create}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--color-accent)]" />
            <h2 className="font-medium">Start a new room</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            You’ll be the host. Share the 6-character code so anyone can join.
          </p>
          <input
            placeholder="Room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!name.trim() || busy}
            className="mt-4 w-full"
          >
            {busy ? 'Creating…' : 'Create room'}
          </Button>
        </form>

        <form
          onSubmit={join}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[var(--color-accent-2)]" />
            <h2 className="font-medium">Join with a code</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Got a 6-character code from a friend? Drop it here.
          </p>
          <input
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="mt-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-center text-lg font-mono uppercase tracking-[0.5em] outline-none focus:border-[var(--color-accent)]"
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={code.trim().length < 4}
            className="mt-4 w-full"
          >
            Join room
          </Button>
        </form>
      </div>

      <div className="mt-12 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Public rooms</h2>
        <span className="text-xs text-[var(--color-text-muted)]">
          {rooms.length > 0 && `${rooms.length} live`}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && rooms.length === 0 && (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        )}
        {!loading && rooms.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-16 text-center text-sm text-[var(--color-text-muted)]">
            No public rooms right now. Be the first.
          </div>
        )}
        {rooms.map((r) => (
          <Link
            key={r.id}
            href={`/rooms/${r.code}`}
            className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 truncate font-medium">{r.name}</h3>
              <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-xs tracking-widest text-[var(--color-text-muted)]">
                {r.code}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              hosted by @{r.hostUsername}
            </p>
            <div className="mt-5 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-[var(--color-text-muted)]">
                <Users size={12} />
                {r.memberCount} listening
              </span>
              {r.nowPlaying ? (
                <span className="truncate text-[var(--color-accent)]">▶ {r.nowPlaying.title}</span>
              ) : (
                <span className="text-[var(--color-text-subtle)]">idle</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}