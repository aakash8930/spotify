import { Server as IOServer, type Socket } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import { parse as parseCookie } from 'cookie';
import { createId } from '@paralleldrive/cuid2';
import { prisma } from '@resonate/db';
import type { Track } from '@resonate/shared/tracks';
import { SESSION_COOKIE, validateSession } from '../lib/session.js';
import { env } from '../env.js';
import { RoomState, type RoomRuntimeState } from './state.js';

// Realtime gateway. Lives in the same process as the REST API so it shares
// memory (RoomState) and the session table. When we scale horizontally,
// this becomes its own service and the in-memory state moves to Redis —
// the event names stay the same.
//
// Wire format: short event names + small payloads. Every state-mutating
// event from a client is validated against host permissions before broadcast.

type ClientToServer = {
  join: (payload: { code: string }, ack: (res: AckResult) => void) => void;
  play: (payload: { positionSec?: number }) => void;
  pause: () => void;
  seek: (payload: { positionSec: number }) => void;
  set_track: (payload: { track: Track }) => void;
  queue_add: (payload: { track: Track }) => void;
  queue_remove: (payload: { trackId: string }) => void;
  next: () => void;
  chat_send: (payload: { body: string }) => void;
  // Pong for the host's "track ended" signal — only the host's audio is the
  // authority on track end. Other clients will get state from the server.
  track_ended: () => void;
};

type ServerToClient = {
  state: (payload: PlaybackPayload) => void;
  members: (payload: { members: PublicMember[] }) => void;
  chat: (payload: ChatPayload) => void;
  error: (payload: { message: string }) => void;
};

type AckResult = { ok: true; room: RoomSnapshot } | { ok: false; error: string };

type PublicMember = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isHost: boolean;
};

type PlaybackPayload = {
  current: Track | null;
  isPlaying: boolean;
  basePositionSec: number;
  anchorTimeMs: number;
  serverTimeMs: number;
  queue: Track[];
};

type ChatPayload = {
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
  members: PublicMember[];
  playback: PlaybackPayload;
};

type SocketData = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  roomId: string | null;
};

type IO = IOServer<ClientToServer, ServerToClient, Record<string, never>, SocketData>;
type SocketT = Socket<ClientToServer, ServerToClient, Record<string, never>, SocketData>;

export async function attachRealtime(app: FastifyInstance) {
  const io: IOServer = new IOServer(app.server, {
    cors: {
      // Same dev/prod split as the REST CORS plugin — see server.ts.
      origin: env.NODE_ENV === 'production' ? env.WEB_ORIGIN : true,
      credentials: true,
    },
    maxHttpBufferSize: 1_000_000,
  });

  // Auth via the same session cookie as REST. Reject unauthenticated sockets
  // outright — the client retries after login.
  io.use(async (socket, next) => {
    const cookies = parseCookie(socket.handshake.headers.cookie ?? '');
    const token = cookies[SESSION_COOKIE];
    const session = await validateSession(token);
    if (!session) return next(new Error('unauthorized'));
    const u = session.user;
    socket.data = {
      userId: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      roomId: null,
    };
    next();
  });

  io.on('connection', (socket: SocketT) => {
    socket.on('join', async ({ code }, ack) => {
      const dbRoom = await prisma.room.findUnique({
        where: { code: code.toUpperCase() },
      });
      if (!dbRoom || dbRoom.closedAt) return ack({ ok: false, error: 'room not found' });

      const state = RoomState.ensure(dbRoom.id, dbRoom.hostId);
      socket.data.roomId = dbRoom.id;
      await socket.join(dbRoom.id);

      RoomState.addMember(
        dbRoom.id,
        {
          userId: socket.data.userId,
          username: socket.data.username,
          displayName: socket.data.displayName,
          avatarUrl: socket.data.avatarUrl,
        },
        socket.id,
      );

      // Persist membership for analytics/history. Upsert is idempotent across
      // multiple tabs (same composite PK).
      await prisma.roomMember
        .upsert({
          where: { roomId_userId: { roomId: dbRoom.id, userId: socket.data.userId } },
          update: { leftAt: null },
          create: { roomId: dbRoom.id, userId: socket.data.userId },
        })
        .catch(() => {});

      broadcastMembers(io, state);
      ack({
        ok: true,
        room: {
          id: dbRoom.id,
          code: dbRoom.code,
          name: dbRoom.name,
          hostId: state.hostId,
          members: snapshotMembers(state),
          playback: snapshotPlayback(state),
        },
      });
    });

    socket.on('play', ({ positionSec }) => withHostState(socket, (state) => {
      RoomState.play(state.roomId, positionSec);
      broadcastPlayback(io, state);
    }));

    socket.on('pause', () => withHostState(socket, (state) => {
      RoomState.pause(state.roomId);
      broadcastPlayback(io, state);
    }));

    socket.on('seek', ({ positionSec }) => withHostState(socket, (state) => {
      RoomState.seek(state.roomId, positionSec);
      broadcastPlayback(io, state);
    }));

    socket.on('set_track', ({ track }) => withHostState(socket, (state) => {
      RoomState.setCurrent(state.roomId, track);
      broadcastPlayback(io, state);
    }));

    // Anyone in the room can add to the queue. Only host removes/skips.
    socket.on('queue_add', ({ track }) => withState(socket, (state) => {
      RoomState.enqueue(state.roomId, track);
      broadcastPlayback(io, state);
    }));

    socket.on('queue_remove', ({ trackId }) => withHostState(socket, (state) => {
      RoomState.removeFromQueue(state.roomId, trackId);
      broadcastPlayback(io, state);
    }));

    socket.on('next', () => withHostState(socket, (state) => {
      RoomState.advance(state.roomId);
      broadcastPlayback(io, state);
    }));

    // Only the host's tab is the authoritative end-of-track signal — every
    // client's audio reaches the end at roughly the same time, but we trust
    // exactly one of them to avoid double-advancing.
    socket.on('track_ended', () => withHostState(socket, (state) => {
      RoomState.advance(state.roomId);
      broadcastPlayback(io, state);
    }));

    socket.on('chat_send', async ({ body }) => {
      const trimmed = body.trim();
      if (!trimmed || trimmed.length > 500) return;
      const state = currentState(socket);
      if (!state) return;
      const id = createId();
      const createdAt = new Date();
      // Persist async; broadcast immediately.
      prisma.chatMessage
        .create({
          data: {
            id,
            roomId: state.roomId,
            userId: socket.data.userId,
            body: trimmed,
            createdAt,
          },
        })
        .catch(() => {});
      io.to(state.roomId).emit('chat', {
        id,
        userId: socket.data.userId,
        username: socket.data.username,
        body: trimmed,
        createdAt: createdAt.toISOString(),
      });
    });

    socket.on('disconnect', async () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      const state = RoomState.get(roomId);
      if (!state) return;
      const fullyLeft = RoomState.removeSocket(roomId, socket.data.userId, socket.id);
      if (fullyLeft) {
        prisma.roomMember
          .updateMany({
            where: { roomId, userId: socket.data.userId },
            data: { leftAt: new Date() },
          })
          .catch(() => {});
      }
      broadcastMembers(io, state);

      // If the host left and there are still members, hand the role to the
      // first remaining member. If the room is empty, drop it.
      if (fullyLeft && socket.data.userId === state.hostId) {
        const next = state.members.values().next().value;
        if (next) {
          RoomState.setHost(roomId, next.userId);
          io.to(roomId).emit('members', { members: snapshotMembers(state) });
        }
      }
      if (RoomState.isEmpty(roomId)) {
        RoomState.destroy(roomId);
      }
    });
  });

  app.log.info('Realtime gateway attached');
  return io;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currentState = (socket: SocketT): RoomRuntimeState | null => {
  const id = socket.data.roomId;
  if (!id) return null;
  return RoomState.get(id) ?? null;
};

const withState = (socket: SocketT, fn: (s: RoomRuntimeState) => void) => {
  const s = currentState(socket);
  if (s) fn(s);
};

const withHostState = (socket: SocketT, fn: (s: RoomRuntimeState) => void) => {
  const s = currentState(socket);
  if (!s) return;
  if (s.hostId !== socket.data.userId) {
    socket.emit('error', { message: 'host only' });
    return;
  }
  fn(s);
};

const snapshotMembers = (state: RoomRuntimeState): PublicMember[] =>
  Array.from(state.members.values()).map((m) => ({
    userId: m.userId,
    username: m.username,
    displayName: m.displayName,
    avatarUrl: m.avatarUrl,
    isHost: m.userId === state.hostId,
  }));

const snapshotPlayback = (state: RoomRuntimeState): PlaybackPayload => ({
  current: state.current,
  isPlaying: state.isPlaying,
  basePositionSec: state.basePositionSec,
  anchorTimeMs: state.anchorTimeMs,
  serverTimeMs: Date.now(),
  queue: state.queue,
});

const broadcastMembers = (io: IO, state: RoomRuntimeState) => {
  io.to(state.roomId).emit('members', { members: snapshotMembers(state) });
};

const broadcastPlayback = (io: IO, state: RoomRuntimeState) => {
  io.to(state.roomId).emit('state', snapshotPlayback(state));
};
