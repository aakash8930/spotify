import type { FastifyInstance } from 'fastify';
import { createId } from '@paralleldrive/cuid2';
import { prisma } from '@resonate/db';
import { CreateRoomInput } from '@resonate/shared/rooms';
import { RoomState } from '../realtime/state.js';

// 6-char shareable codes. Skip confusable chars (0/O, 1/I/L) so people can
// read them off a screen reliably. ~30 bits of entropy is plenty when codes
// only need to be unique among the few thousand rooms open at once.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generateCode = () =>
  Array.from({ length: 6 }, () =>
    CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length)),
  ).join('');

export async function roomRoutes(app: FastifyInstance) {
  // Public room directory — only currently-open rooms with at least one
  // member visible right now. We pull membership from the in-memory state
  // rather than the DB because the DB only tracks join history.
  app.get('/rooms', async () => {
    const open = await prisma.room.findMany({
      where: { closedAt: null, isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { host: { select: { username: true, displayName: true } } },
    });
    return {
      rooms: open.map((r) => {
        const live = RoomState.get(r.id);
        return {
          id: r.id,
          code: r.code,
          name: r.name,
          hostId: r.hostId,
          hostUsername: r.host.username,
          isPublic: r.isPublic,
          memberCount: live?.members.size ?? 0,
          nowPlaying: live?.current
            ? { title: live.current.title, artist: live.current.artist }
            : null,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    };
  });

  app.post('/rooms', { preHandler: app.requireAuth }, async (req, reply) => {
    const parsed = CreateRoomInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    // Loop until we get a unique code. With ~31^6 = 887 million possibilities
    // and a few thousand active rooms, this terminates on the first try ~99.99%
    // of the time. Cap retries to fail fast if the DB index is broken.
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateCode();
      try {
        const room = await prisma.room.create({
          data: {
            id: createId(),
            code,
            name: parsed.data.name,
            isPublic: parsed.data.isPublic ?? true,
            hostId: req.user!.id,
          },
        });
        RoomState.ensure(room.id, room.hostId);
        return { room: { id: room.id, code: room.code, name: room.name, isPublic: room.isPublic } };
      } catch (e) {
        // Unique-violation on code — try again. Anything else is fatal.
        if ((e as { code?: string }).code !== 'P2002') throw e;
      }
    }
    return reply.code(500).send({ error: 'could not allocate room code' });
  });

  app.get('/rooms/by-code/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { host: { select: { username: true, displayName: true } } },
    });
    if (!room || room.closedAt) return reply.code(404).send({ error: 'not found' });
    return {
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        hostId: room.hostId,
        hostUsername: room.host.username,
        isPublic: room.isPublic,
      },
    };
  });

  app.get('/rooms/:id/messages', async (req, reply) => {
    const { id } = req.params as { id: string };
    const room = await prisma.room.findUnique({ where: { id }, select: { isPublic: true } });
    if (!room) return reply.code(404).send({ error: 'not found' });
    if (!room.isPublic && !req.user) return reply.code(401).send({ error: 'unauthorized' });
    const messages = await prisma.chatMessage.findMany({
      where: { roomId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { username: true } } },
    });
    return {
      messages: messages
        .map((m) => ({
          id: m.id,
          roomId: m.roomId,
          userId: m.userId,
          username: m.user.username,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        }))
        .reverse(),
    };
  });

  // Host-only manual close. Rooms also auto-close on the WS layer when the
  // last socket leaves and the host has disconnected.
  app.post('/rooms/:id/close', { preHandler: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return reply.code(404).send({ error: 'not found' });
    if (room.hostId !== req.user!.id) return reply.code(403).send({ error: 'forbidden' });
    await prisma.room.update({ where: { id }, data: { closedAt: new Date() } });
    RoomState.destroy(id);
    return { ok: true };
  });
}
