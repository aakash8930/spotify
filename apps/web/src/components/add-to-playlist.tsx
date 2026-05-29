'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import type { Playlist } from '@resonate/shared/playlists';
import { apiGet, apiSend, invalidate } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

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
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const add = async (playlist: Playlist) => {
    try {
      await apiSend(`/api/playlists/${playlist.id}/tracks`, 'POST', { trackId });
      invalidate(`/api/playlists/${playlist.id}`);
      invalidate('/api/playlists');
      toast.success(`Added to “${playlist.name}”`);
    } catch (e) {
      toast.error('Could not add track', { description: (e as Error).message });
    }
    setOpen(false);
  };

  const createAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await apiSend<{ playlist: Playlist }>('/api/playlists', 'POST', { name });
      await apiSend(`/api/playlists/${res.playlist.id}/tracks`, 'POST', { trackId });
      invalidate('/api/playlists');
      toast.success(`Created “${res.playlist.name}” and added track`);
    } catch (err) {
      toast.error('Could not create playlist', { description: (err as Error).message });
    }
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
        aria-expanded={open}
        className={cn(
          'grid size-8 place-items-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)]',
          'opacity-0 group-hover:opacity-100 focus:opacity-100 aria-expanded:opacity-100',
        )}
      >
        <Plus size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1.5 shadow-[var(--shadow-elevated)]"
        >
          <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
            Add to playlist
          </div>
          {loading && (
            <div className="px-2 py-3 text-sm text-[var(--color-text-muted)]">Loading…</div>
          )}
          {!loading && playlists.length === 0 && !creating && (
            <div className="px-2 py-3 text-sm text-[var(--color-text-muted)]">No playlists yet.</div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {playlists.map((p) => (
              <button
                key={p.id}
                type="button"
                role="menuitem"
                onClick={() => add(p)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition hover:bg-[var(--color-surface-3)]"
              >
                <span className="min-w-0 truncate">{p.name}</span>
                <span className="shrink-0 text-xs text-[var(--color-text-subtle)]">
                  {p.trackCount}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-1 border-t border-[var(--color-border)] pt-1">
            {creating ? (
              <form onSubmit={createAndAdd} className="flex items-center gap-1 p-1">
                <input
                  autoFocus
                  placeholder="New playlist…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
                />
                <button
                  type="submit"
                  aria-label="Create playlist and add"
                  className="grid size-7 place-items-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                >
                  <Check size={14} />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[var(--color-accent)] transition hover:bg-[var(--color-surface-3)]"
              >
                <Plus size={14} />
                New playlist
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
