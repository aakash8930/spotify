'use client';

import { useEffect, useRef, useState } from 'react';
import type { Playlist } from '@resonate/shared/playlists';
import { apiGet, apiSend, invalidate } from '@/lib/api';

export function AddToPlaylist({ trackId }: { trackId: string }) {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiGet<{ playlists: Playlist[] }>('/api/playlists')
      .then((r) => setPlaylists(r.playlists))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const add = async (playlistId: string) => {
    await apiSend(`/api/playlists/${playlistId}/tracks`, 'POST', { trackId });
    invalidate(`/api/playlists/${playlistId}`);
    invalidate('/api/playlists');
    setOpen(false);
  };

  const createAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await apiSend<{ playlist: Playlist }>('/api/playlists', 'POST', { name });
    await apiSend(`/api/playlists/${res.playlist.id}/tracks`, 'POST', { trackId });
    invalidate('/api/playlists');
    setName('');
    setCreating(false);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Add to playlist"
        className="text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
      >
        +
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2 shadow-xl">
          <div className="px-2 py-1 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            Add to playlist
          </div>
          {loading && <div className="px-2 py-3 text-sm text-[var(--color-muted)]">Loading…</div>}
          {!loading && playlists.length === 0 && !creating && (
            <div className="px-2 py-3 text-sm text-[var(--color-muted)]">No playlists yet.</div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {playlists.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p.id)}
                className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--color-surface)]"
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="mt-1 border-t border-[var(--color-border)] pt-1">
            {creating ? (
              <form onSubmit={createAndAdd} className="flex gap-1 px-1 pt-1">
                <input
                  autoFocus
                  placeholder="New playlist…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md bg-[var(--color-accent)] px-2 py-1 text-sm font-medium text-black"
                >
                  +
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-[var(--color-accent)] hover:bg-[var(--color-surface)]"
              >
                + New playlist
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
