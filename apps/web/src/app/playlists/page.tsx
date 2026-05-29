'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Playlist } from '@resonate/shared/playlists';
import { apiGet, apiSend, invalidate, useApi } from '@/lib/api';

export default function PlaylistsPage() {
  const router = useRouter();
  const { data, loading } = useApi('/api/playlists', (k) =>
    apiGet<{ playlists: Playlist[] }>(k),
  );
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const res = await apiSend<{ playlist: Playlist }>('/api/playlists', 'POST', { name });
      invalidate('/api/playlists');
      setName('');
      setCreating(false);
      router.push(`/playlists/${res.playlist.id}`);
    } finally {
      setBusy(false);
    }
  };

  const playlists = data?.playlists ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Playlists</h1>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black"
        >
          {creating ? 'Cancel' : 'New playlist'}
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="mt-6 flex gap-2">
          <input
            autoFocus
            placeholder="Playlist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2"
          />
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
          >
            Create
          </button>
        </form>
      )}

      {loading && playlists.length === 0 && (
        <p className="mt-12 text-center text-sm text-[var(--color-muted)]">Loading…</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {playlists.map((p) => (
          <Link
            key={p.id}
            href={`/playlists/${p.id}`}
            className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:bg-[var(--color-surface-2)]"
          >
            <div className="aspect-square w-full rounded-xl bg-gradient-to-br from-[var(--color-accent)]/40 to-[var(--color-accent-2)]/40" />
            <div className="mt-4 truncate font-medium">{p.name}</div>
            <div className="mt-1 flex items-center justify-between text-xs text-[var(--color-muted)]">
              <span>{p.trackCount} tracks</span>
              <span>{p.isPublic ? 'Public' : 'Private'}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
