'use client';

import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type { Track } from '@resonate/shared/tracks';

// Wire types — keep in sync with apps/api/src/realtime/gateway.ts. We don't
// share these via @resonate/shared because the server's Socket.IO types add
// generics we'd rather not leak into the web bundle.

type Member = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isHost: boolean;
};

type Playback = {
  current: Track | null;
  isPlaying: boolean;
  basePositionSec: number;
  anchorTimeMs: number;
  serverTimeMs: number;
  queue: Track[];
};

type ChatMsg = {
  id: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string;
};

type RoomSnapshot = {
  id: string;
  code: string;
  name: string;
  hostId: string;
  members: Member[];
  playback: Playback;
};

type JoinAck = { ok: true; room: RoomSnapshot } | { ok: false; error: string };

type RoomStore = {
  socket: Socket | null;
  room: RoomSnapshot | null;
  playback: Playback | null;
  members: Member[];
  chat: ChatMsg[];
  // Estimated offset between this client's clock and the server's clock,
  // measured at join time. We use this to compute the "true" current position
  // without needing live NTP. Positive = client clock is ahead of server.
  clockOffsetMs: number;
  error: string | null;

  connect: () => Socket;
  join: (code: string, history: ChatMsg[]) => Promise<RoomSnapshot>;
  leave: () => void;

  hostPlay: (positionSec?: number) => void;
  hostPause: () => void;
  hostSeek: (positionSec: number) => void;
  setTrack: (track: Track) => void;
  enqueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  next: () => void;
  trackEnded: () => void;
  sendChat: (body: string) => void;
};

export const useRoom = create<RoomStore>((set, get) => ({
  socket: null,
  room: null,
  playback: null,
  members: [],
  chat: [],
  clockOffsetMs: 0,
  error: null,

  connect: () => {
    const existing = get().socket;
    if (existing && existing.connected) return existing;
    if (existing) existing.connect();

    // Build the API URL relative to the page so the same code works whether
    // someone hits localhost or a LAN address from another device. Override
    // with NEXT_PUBLIC_API_ORIGIN if running web/api on different hosts.
    const url =
      process.env.NEXT_PUBLIC_API_ORIGIN ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:4000`
        : 'http://localhost:4000');
    const socket = io(url, { withCredentials: true, autoConnect: true });

    socket.on('state', (p: Playback) => {
      set({ playback: p });
    });
    socket.on('members', ({ members }: { members: Member[] }) => {
      set({ members });
    });
    socket.on('chat', (msg: ChatMsg) => {
      set((s) => ({ chat: [...s.chat, msg].slice(-200) }));
    });
    socket.on('error', ({ message }: { message: string }) => {
      set({ error: message });
    });
    socket.on('disconnect', () => {
      // Soft-keep the snapshot on disconnect so the UI doesn't flash empty.
      // socket.io will auto-reconnect; on reconnect we re-join below.
    });
    socket.on('connect', () => {
      const room = get().room;
      if (room) {
        // Re-establish membership after a transient disconnect.
        socket.emit('join', { code: room.code }, () => {});
      }
    });

    set({ socket });
    return socket;
  },

  join: async (code, history) => {
    const socket = get().connect();
    return new Promise<RoomSnapshot>((resolve, reject) => {
      const sentAt = Date.now();
      socket.emit('join', { code }, (ack: JoinAck) => {
        if (!ack.ok) {
          set({ error: ack.error });
          reject(new Error(ack.error));
          return;
        }
        const recvAt = Date.now();
        // Round-trip-corrected clock-offset estimate. Assumes symmetric
        // network latency, which is wrong by a few tens of ms on a bad
        // network — fine for our 250ms drift threshold.
        const rtt = recvAt - sentAt;
        const offset = recvAt - (ack.room.playback.serverTimeMs + rtt / 2);
        set({
          room: ack.room,
          playback: ack.room.playback,
          members: ack.room.members,
          chat: history,
          clockOffsetMs: offset,
          error: null,
        });
        resolve(ack.room);
      });
    });
  },

  leave: () => {
    const s = get().socket;
    s?.disconnect();
    set({ socket: null, room: null, playback: null, members: [], chat: [], error: null });
  },

  hostPlay: (positionSec) => get().socket?.emit('play', { positionSec }),
  hostPause: () => get().socket?.emit('pause'),
  hostSeek: (positionSec) => get().socket?.emit('seek', { positionSec }),
  setTrack: (track) => get().socket?.emit('set_track', { track }),
  enqueue: (track) => get().socket?.emit('queue_add', { track }),
  removeFromQueue: (trackId) => get().socket?.emit('queue_remove', { trackId }),
  next: () => get().socket?.emit('next'),
  trackEnded: () => get().socket?.emit('track_ended'),
  sendChat: (body) => get().socket?.emit('chat_send', { body }),
}));

// Compute the true current playhead given the latest server snapshot and our
// estimated clock offset. Used by the room audio element to decide when to
// re-seek (drift > 250 ms) versus let local playback continue.
export function computeLivePosition(playback: Playback, clockOffsetMs: number): number {
  if (!playback.current) return 0;
  const serverNowMs = Date.now() - clockOffsetMs;
  const elapsed = playback.isPlaying ? (serverNowMs - playback.anchorTimeMs) / 1000 : 0;
  const pos = playback.basePositionSec + elapsed;
  return Math.max(0, Math.min(pos, playback.current.durationSec));
}
