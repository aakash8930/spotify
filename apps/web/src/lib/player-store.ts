'use client';

import { create } from 'zustand';
import type { Track } from '@resonate/shared/tracks';

type RepeatMode = 'off' | 'all' | 'one';

type PlayerState = {
  queue: Track[];
  currentIndex: number;
  current: Track | null;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  volume: number; // 0..1
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;

  playTrack: (track: Track, queue?: Track[]) => void;
  setIsPlaying: (v: boolean) => void;
  setPosition: (sec: number) => void;
  setDuration: (sec: number) => void;
  seekTo: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  next: () => void;
  prev: () => void;
  // Internal — set by the audio element when it wants to seek without
  // touching position state. Lets us imperatively scrub.
  _seekRequest: number | null;
  consumeSeek: () => number | null;
};

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  current: null,
  isPlaying: false,
  positionSec: 0,
  durationSec: 0,
  volume: 0.85,
  muted: false,
  shuffle: false,
  repeat: 'off',
  _seekRequest: null,

  playTrack: (track, queue) => {
    const newQueue = queue ?? [track];
    const idx = newQueue.findIndex((t) => t.id === track.id);
    set({
      queue: newQueue,
      currentIndex: idx,
      current: newQueue[idx] ?? track,
      isPlaying: true,
      positionSec: 0,
      durationSec: track.durationSec || 0,
    });
  },
  setIsPlaying: (v) => set({ isPlaying: v }),
  setPosition: (sec) => set({ positionSec: sec }),
  setDuration: (sec) => set({ durationSec: sec }),
  seekTo: (sec) => set({ _seekRequest: sec, positionSec: sec }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: false }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
    })),
  consumeSeek: () => {
    const v = get()._seekRequest;
    if (v !== null) set({ _seekRequest: null });
    return v;
  },
  next: () => {
    const { queue, currentIndex, repeat, shuffle } = get();
    if (queue.length === 0) return;
    if (repeat === 'one') {
      set({ positionSec: 0, _seekRequest: 0, isPlaying: true });
      return;
    }
    let nextIdx: number;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = currentIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0;
        else {
          set({ isPlaying: false });
          return;
        }
      }
    }
    set({
      currentIndex: nextIdx,
      current: queue[nextIdx]!,
      positionSec: 0,
      durationSec: queue[nextIdx]!.durationSec || 0,
      isPlaying: true,
    });
  },
  prev: () => {
    const { queue, currentIndex, positionSec } = get();
    // Restart current track if more than 3s in — matches how every player works.
    if (positionSec > 3) {
      set({ _seekRequest: 0, positionSec: 0 });
      return;
    }
    const prevIdx = Math.max(0, currentIndex - 1);
    set({
      currentIndex: prevIdx,
      current: queue[prevIdx] ?? null,
      positionSec: 0,
      durationSec: queue[prevIdx]?.durationSec || 0,
      isPlaying: true,
    });
  },
}));
