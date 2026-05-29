'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import type { Track } from '@resonate/shared/tracks';
import { apiSend, invalidate } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

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
        toast.success('Added to liked');
      } else {
        await apiSend(`/api/tracks/${trackId}/like`, 'DELETE');
      }
      invalidate('/api/library/likes');
    } catch (err) {
      setLiked(!next);
      toast.error(next ? 'Could not like track' : 'Could not unlike track', {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  const px = size === 'sm' ? 16 : 18;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={cn(
        'grid size-8 place-items-center rounded-full transition-colors',
        liked
          ? 'text-[var(--color-accent-2)]'
          : 'text-[var(--color-text-muted)] opacity-0 hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text)] group-hover:opacity-100 focus:opacity-100 aria-pressed:opacity-100',
      )}
    >
      <Heart size={px} className={liked ? 'fill-current' : ''} />
    </button>
  );
}
