'use client';

import { useState } from 'react';
import type { Track } from '@resonate/shared/tracks';
import { apiSend, invalidate } from '@/lib/api';

export function LikeButton({
  trackId,
  track,
  initial,
  size = 'md',
}: {
  trackId: string;
  // Pass the full track when liking external (Saavn) tracks — the API
  // upserts the row on first like since it doesn't exist in our DB yet.
  track?: Track;
  initial?: boolean;
  size?: 'sm' | 'md';
}) {
  const [liked, setLiked] = useState(initial ?? false);
  const [busy, setBusy] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    const next = !liked;
    setLiked(next);
    setBusy(true);
    try {
      if (next) {
        await apiSend(`/api/tracks/${trackId}/like`, 'POST', track ? { track } : undefined);
      } else {
        await apiSend(`/api/tracks/${trackId}/like`, 'DELETE');
      }
      invalidate('/api/library/likes');
    } catch {
      setLiked(!next);
    } finally {
      setBusy(false);
    }
  };

  const cls = size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={`${cls} transition ${liked ? 'text-[var(--color-accent-2)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}
    >
      {liked ? '♥' : '♡'}
    </button>
  );
}
