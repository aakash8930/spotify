import type { FastifyInstance } from 'fastify';
import { prisma } from '@resonate/db';
import { deleteObject } from '../lib/storage.js';

export async function libraryRoutes(app: FastifyInstance) {
  // Liked tracks — newest like first.
  app.get('/library/likes', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.user!.id;
    const likes = await prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { track: true },
      take: 200,
    });
    return { tracks: likes.map((l) => l.track) };
  });

  // Tracks the user has uploaded.
  app.get('/library/uploads', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.user!.id;
    const tracks = await prisma.track.findMany({
      where: { uploadedById: userId, source: 'UPLOAD' },
      orderBy: { createdAt: 'desc' },
    });
    return { tracks };
  });

  // Delete an uploaded track. Also removes the audio from storage. Cover art
  // we leave in place — multiple tracks could share the same cover URL once
  // we add an "edit metadata" flow.
  app.delete('/tracks/:id', { preHandler: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = req.user!.id;
    const track = await prisma.track.findUnique({ where: { id } });
    if (!track) return reply.code(404).send({ error: 'not found' });
    if (track.source !== 'UPLOAD' || track.uploadedById !== userId) {
      return reply.code(403).send({ error: 'cannot delete this track' });
    }
    if (track.storageKey) await deleteObject(track.storageKey);
    await prisma.track.delete({ where: { id } });
    return { ok: true };
  });
}
