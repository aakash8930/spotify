'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ListMusic, Plus, X } from 'lucide-react';
import type { Playlist } from '@resonate/shared/playlists';
import { CardSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
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
      toast.success('Playlist created');
      router.push(`/playlists/${res.playlist.id}`);
    } catch (err) {
      toast.error('Could not create playlist', { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const playlists = data?.playlists ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Playlists</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {playlists.length === 0
              ? 'Build your first set.'
              : `${playlists.length} ${playlists.length === 1 ? 'playlist' : 'playlists'}`}
          </p>
        </div>
        <Button
          variant={creating ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setCreating((v) => !v)}
          className="gap-1.5"
        >
          {creating ? <X size={14} /> : <Plus size={14} />}
          {creating ? 'Cancel' : 'New'}
        </Button>
      </div>

      {creating && (
        <form
          onSubmit={create}
          className="mt-6 flex gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
        >
          <input
            autoFocus
            placeholder="Playlist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <Button type="submit" variant="primary" size="sm" disabled={!name.trim() || busy}>
            Create
          </Button>
        </form>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading && playlists.length === 0 && (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        )}
        {!loading && playlists.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-16 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
              <ListMusic size={20} />
            </div>
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">
              You haven’t made a playlist yet.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreating(true)}
              className="mt-4 gap-1.5"
            >
              <Plus size={14} /> Create one
            </Button>
          </div>
        )}
        {playlists.map((p) => (
          <Link
            key={p.id}
            href={`/playlists/${p.id}`}
            className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)]"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-[var(--color-accent)]/40 to-[var(--color-accent-2)]/40 shadow-[var(--shadow-card)]">
              <div className="absolute inset-0 grid place-items-center text-white/30 transition group-hover:scale-105">
                <ListMusic size={48} />
              </div>
            </div>
            <div className="mt-4 truncate font-medium">{p.name}</div>
            <div className="mt-1 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>
                {p.trackCount} {p.trackCount === 1 ? 'track' : 'tracks'}
              </span>
              <span>{p.isPublic ? 'Public' : 'Private'}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}