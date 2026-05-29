'use client';

import { create } from 'zustand';
import type { Track } from '@resonate/shared/tracks';

type PlayerState = {
  queue: Track[];
  currentIndex: number;
  current: Track | null;
  isPlaying: boolean;
  positionSec: number;

  playTrack: (track: Track, queue?: Track[]) => void;
  setIsPlaying: (v: boolean) => void;
  setPosition: (sec: number) => void;
  next: () => void;
  prev: () => void;
};

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  current: null,
  isPlaying: false,
  positionSec: 0,

  playTrack: (track, queue) => {
    const newQueue = queue ?? [track];
    const idx = newQueue.findIndex((t) => t.id === track.id);
    set({
      queue: newQueue,
      currentIndex: idx,
      current: newQueue[idx] ?? track,
      isPlaying: true,
      positionSec: 0,
    });
  },
  setIsPlaying: (v) => set({ isPlaying: v }),
  setPosition: (sec) => set({ positionSec: sec }),
  next: () => {
    const { queue, currentIndex } = get();
    const nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      set({ isPlaying: false });
      return;
    }
    set({ currentIndex: nextIdx, current: queue[nextIdx]!, positionSec: 0, isPlaying: true });
  },
  prev: () => {
    const { queue, currentIndex } = get();
    const prevIdx = Math.max(0, currentIndex - 1);
    set({ currentIndex: prevIdx, current: queue[prevIdx] ?? null, positionSec: 0, isPlaying: true });
  },
}));
