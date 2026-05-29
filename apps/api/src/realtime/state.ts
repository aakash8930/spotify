import type { Track } from '@resonate/shared/tracks';

// In-memory room state. Single source of truth for the realtime layer.
// Postgres holds Room/RoomMember/ChatMessage for persistence; this map holds
// the hot path: who's in the room right now and what the playhead is doing.
//
// Scaling story: when we outgrow one Node process, swap this for a Redis
// hash per room and add a Redis pub/sub channel for cross-process broadcasts.
// The shape stays the same — every write goes through one of the methods
// below, so the redis port is mechanical.

export type RoomMemberInfo = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  socketIds: Set<string>; // a user can have multiple tabs open
};

export type RoomRuntimeState = {
  roomId: string;
  hostId: string;
  // Current track + the anchor for time math. To compute the live position:
  //   if isPlaying: position = basePositionSec + (Date.now() - anchorTimeMs)/1000
  //   else:         position = basePositionSec
  // Clients receive {basePositionSec, anchorTimeMs, isPlaying} and do the
  // same math, correcting for clock drift via the (serverTime, clientTime)
  // delta they measured at handshake.
  current: Track | null;
  isPlaying: boolean;
  basePositionSec: number;
  anchorTimeMs: number;
  queue: Track[];
  members: Map<string, RoomMemberInfo>;
};

const rooms = new Map<string, RoomRuntimeState>();

export const RoomState = {
  ensure(roomId: string, hostId: string): RoomRuntimeState {
    let r = rooms.get(roomId);
    if (!r) {
      r = {
        roomId,
        hostId,
        current: null,
        isPlaying: false,
        basePositionSec: 0,
        anchorTimeMs: Date.now(),
        queue: [],
        members: new Map(),
      };
      rooms.set(roomId, r);
    }
    return r;
  },

  get(roomId: string): RoomRuntimeState | undefined {
    return rooms.get(roomId);
  },

  addMember(
    roomId: string,
    member: Omit<RoomMemberInfo, 'socketIds'>,
    socketId: string,
  ): RoomMemberInfo {
    const room = rooms.get(roomId);
    if (!room) throw new Error('room not initialized');
    let entry = room.members.get(member.userId);
    if (!entry) {
      entry = { ...member, socketIds: new Set() };
      room.members.set(member.userId, entry);
    }
    entry.socketIds.add(socketId);
    return entry;
  },

  // Returns true if the user fully left (no more open sockets), so the
  // caller can broadcast a leave event and decide whether to close the room.
  removeSocket(roomId: string, userId: string, socketId: string): boolean {
    const room = rooms.get(roomId);
    if (!room) return false;
    const entry = room.members.get(userId);
    if (!entry) return false;
    entry.socketIds.delete(socketId);
    if (entry.socketIds.size === 0) {
      room.members.delete(userId);
      return true;
    }
    return false;
  },

  isEmpty(roomId: string): boolean {
    const room = rooms.get(roomId);
    return !room || room.members.size === 0;
  },

  // Drop the room entirely. The REST closeRoom handler decides when.
  destroy(roomId: string): void {
    rooms.delete(roomId);
  },

  setHost(roomId: string, userId: string): void {
    const r = rooms.get(roomId);
    if (r) r.hostId = userId;
  },

  // Compute the *effective* current position. Used when sending state to
  // a late joiner so they don't hear silence while they catch up.
  effectivePositionSec(room: RoomRuntimeState): number {
    if (!room.isPlaying || !room.current) return room.basePositionSec;
    return room.basePositionSec + (Date.now() - room.anchorTimeMs) / 1000;
  },

  play(roomId: string, atPositionSec?: number): void {
    const r = rooms.get(roomId);
    if (!r || !r.current) return;
    if (atPositionSec !== undefined) r.basePositionSec = clampPos(atPositionSec, r.current);
    else if (!r.isPlaying) {
      // resume from last known base position; no change to base, just reanchor
    }
    r.isPlaying = true;
    r.anchorTimeMs = Date.now();
  },

  pause(roomId: string): void {
    const r = rooms.get(roomId);
    if (!r) return;
    if (r.isPlaying) {
      // Snap base to wherever the playhead currently is, then stop the clock.
      r.basePositionSec = RoomState.effectivePositionSec(r);
    }
    r.isPlaying = false;
    r.anchorTimeMs = Date.now();
  },

  seek(roomId: string, positionSec: number): void {
    const r = rooms.get(roomId);
    if (!r || !r.current) return;
    r.basePositionSec = clampPos(positionSec, r.current);
    r.anchorTimeMs = Date.now();
  },

  // Replace the current track. Resets the playhead to 0 and starts playing
  // (matches user expectation: clicking a track plays it).
  setCurrent(roomId: string, track: Track): void {
    const r = rooms.get(roomId);
    if (!r) return;
    r.current = track;
    r.basePositionSec = 0;
    r.anchorTimeMs = Date.now();
    r.isPlaying = true;
  },

  enqueue(roomId: string, track: Track): void {
    const r = rooms.get(roomId);
    if (!r) return;
    // De-dup by id within the queue to prevent accidental double-clicks.
    if (r.queue.some((t) => t.id === track.id) || r.current?.id === track.id) return;
    r.queue.push(track);
  },

  removeFromQueue(roomId: string, trackId: string): void {
    const r = rooms.get(roomId);
    if (!r) return;
    r.queue = r.queue.filter((t) => t.id !== trackId);
  },

  // Pop the next track and make it current. If the queue is empty, clears
  // current and stops. Returns the new current (or null if nothing left).
  advance(roomId: string): Track | null {
    const r = rooms.get(roomId);
    if (!r) return null;
    const next = r.queue.shift() ?? null;
    if (next) {
      r.current = next;
      r.basePositionSec = 0;
      r.anchorTimeMs = Date.now();
      r.isPlaying = true;
    } else {
      r.current = null;
      r.basePositionSec = 0;
      r.isPlaying = false;
      r.anchorTimeMs = Date.now();
    }
    return next;
  },
};

const clampPos = (sec: number, track: Track): number =>
  Math.max(0, Math.min(sec, track.durationSec));
