import type { FastifyInstance } from 'fastify';
import { prisma } from '@resonate/db';
import { Track } from '@resonate/shared/tracks';

export async function likeRoutes(app: FastifyInstance) {
  // Toggle: idempotent on both sides — POST always ends up liked, DELETE
  // always ends up unliked. Front-end can fire-and-forget.
  //
  // For SAAVN tracks the row may not exist yet (Saavn tracks live in our DB
  // only after the first interaction). The body can include the full track
  // payload so we can upsert before recording the like.
  app.post('/tracks/:id/like', { preHandler: app.requireAuth }, async (req, reply) => {
    const { id: trackId } = req.params as { id: string };
    const userId = req.user!.id;

    let exists = await prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true },
    });

    if (!exists) {
      const parsed = Track.safeParse((req.body as { track?: unknown } | undefined)?.track);
      if (!parsed.success) return reply.code(404).send({ error: 'not found' });
      const t = parsed.data;
      if (t.id !== trackId) return reply.code(400).send({ error: 'id mismatch' });
      // Upsert handles the race where two clients like the same fresh
      // SAAVN track at the same moment.
      await prisma.track.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          source: t.source,
          externalId: t.externalId,
          title: t.title,
          artist: t.artist,
          album: t.album,
          durationSec: t.durationSec,
          coverUrl: t.coverUrl,
          audioUrl: t.audioUrl,
        },
      });
      exists = { id: t.id };
    }

    await prisma.like.upsert({
      where: { userId_trackId: { userId, trackId } },
      update: {},
      create: { userId, trackId },
    });
    return { liked: true };
  });

  app.delete('/tracks/:id/like', { preHandler: app.requireAuth }, async (req) => {
    const { id: trackId } = req.params as { id: string };
    const userId = req.user!.id;
    await prisma.like
      .delete({ where: { userId_trackId: { userId, trackId } } })
      .catch(() => {});
    return { liked: false };
  });
}
