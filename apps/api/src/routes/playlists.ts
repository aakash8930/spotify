import type { FastifyInstance } from 'fastify';
import { createId } from '@paralleldrive/cuid2';
import { prisma } from '@resonate/db';
import {
  AddTrackToPlaylistInput,
  CreatePlaylistInput,
  UpdatePlaylistInput,
} from '@resonate/shared/playlists';
import { z } from 'zod';

const ReorderInput = z.object({
  // New ordering as a list of trackIds in their desired order. Server-side
  // we rewrite all `position` columns from this list — simpler and avoids
  // gap math, fine at our scale (playlists are small).
  trackIds: z.array(z.string()).min(1).max(2000),
});

export async function playlistRoutes(app: FastifyInstance) {
  app.get('/playlists', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.user!.id;
    const lists = await prisma.playlist.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { tracks: true } } },
    });
    return {
      playlists: lists.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        coverUrl: p.coverUrl,
        ownerId: p.ownerId,
        isPublic: p.isPublic,
        trackCount: p._count.tracks,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  });

  app.post('/playlists', { preHandler: app.requireAuth }, async (req, reply) => {
    const parsed = CreatePlaylistInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const playlist = await prisma.playlist.create({
      data: {
        id: createId(),
        ownerId: req.user!.id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isPublic: parsed.data.isPublic ?? false,
      },
    });
    return { playlist };
  });

  app.get('/playlists/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        tracks: { orderBy: { position: 'asc' }, include: { track: true } },
      },
    });
    if (!playlist) return reply.code(404).send({ error: 'not found' });
    if (!playlist.isPublic && playlist.ownerId !== req.user?.id) {
      return reply.code(403).send({ error: 'forbidden' });
    }
    return {
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        coverUrl: playlist.coverUrl,
        ownerId: playlist.ownerId,
        isPublic: playlist.isPublic,
        createdAt: playlist.createdAt.toISOString(),
        updatedAt: playlist.updatedAt.toISOString(),
        tracks: playlist.tracks.map((t) => t.track),
      },
    };
  });

  app.patch('/playlists/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdatePlaylistInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const owned = await prisma.playlist.findFirst({
      where: { id, ownerId: req.user!.id },
      select: { id: true },
    });
    if (!owned) return reply.code(404).send({ error: 'not found' });
    const playlist = await prisma.playlist.update({ where: { id }, data: parsed.data });
    return { playlist };
  });

  app.delete('/playlists/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.playlist.findFirst({
      where: { id, ownerId: req.user!.id },
      select: { id: true },
    });
    if (!owned) return reply.code(404).send({ error: 'not found' });
    await prisma.playlist.delete({ where: { id } });
    return { ok: true };
  });

  app.post('/playlists/:id/tracks', { preHandler: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = AddTrackToPlaylistInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const owned = await prisma.playlist.findFirst({
      where: { id, ownerId: req.user!.id },
      select: { id: true },
    });
    if (!owned) return reply.code(404).send({ error: 'not found' });
    const track = await prisma.track.findUnique({
      where: { id: parsed.data.trackId },
      select: { id: true },
    });
    if (!track) return reply.code(404).send({ error: 'track not found' });

    // Default to appending. Position values aren't dense — gaps don't matter
    // for ORDER BY position; the reorder endpoint is what compacts them.
    const last = await prisma.playlistTrack.findFirst({
      where: { playlistId: id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = parsed.data.position ?? (last ? last.position + 1 : 0);

    await prisma.playlistTrack.upsert({
      where: { playlistId_trackId: { playlistId: id, trackId: track.id } },
      update: { position },
      create: { playlistId: id, trackId: track.id, position },
    });
    await prisma.playlist.update({ where: { id }, data: { updatedAt: new Date() } });
    return { ok: true };
  });

  app.delete(
    '/playlists/:id/tracks/:trackId',
    { preHandler: app.requireAuth },
    async (req, reply) => {
      const { id, trackId } = req.params as { id: string; trackId: string };
      const owned = await prisma.playlist.findFirst({
        where: { id, ownerId: req.user!.id },
        select: { id: true },
      });
      if (!owned) return reply.code(404).send({ error: 'not found' });
      await prisma.playlistTrack
        .delete({ where: { playlistId_trackId: { playlistId: id, trackId } } })
        .catch(() => {});
      return { ok: true };
    },
  );

  app.put('/playlists/:id/order', { preHandler: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = ReorderInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const owned = await prisma.playlist.findFirst({
      where: { id, ownerId: req.user!.id },
      select: { id: true },
    });
    if (!owned) return reply.code(404).send({ error: 'not found' });

    // Two-step rewrite to avoid (playlistId, position) collisions if we ever
    // add a unique index there: shift everything to negative positions, then
    // assign final ones. At today's scale a single transaction is fine.
    await prisma.$transaction([
      ...parsed.data.trackIds.map((trackId, i) =>
        prisma.playlistTrack.updateMany({
          where: { playlistId: id, trackId },
          data: { position: -1 - i },
        }),
      ),
      ...parsed.data.trackIds.map((trackId, i) =>
        prisma.playlistTrack.updateMany({
          where: { playlistId: id, trackId },
          data: { position: i },
        }),
      ),
    ]);
    return { ok: true };
  });
}
