import type { FastifyInstance } from 'fastify';
import { prisma } from '@resonate/db';
import { SearchTracksQuery } from '@resonate/shared/tracks';
import { searchSaavn, type NormalizedTrack } from '../lib/saavn.js';

export async function trackRoutes(app: FastifyInstance) {
  // Unified search across the catalog provider (Saavn) and our own uploads.
  // Returns a single flat list, catalog results first. The UI just renders
  // whatever it gets — provider details stay in this layer.
  app.get('/tracks/search', async (req, reply) => {
    const parsed = SearchTracksQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { q, source, limit, offset } = parsed.data;

    const catalogPromise =
      source !== 'UPLOAD'
        ? searchSaavn(q, limit, offset).catch((e) => {
            req.log.warn({ err: e }, 'saavn search failed');
            return { results: [] as NormalizedTrack[], available: false };
          })
        : Promise.resolve({ results: [] as NormalizedTrack[], available: false });

    const uploadsPromise =
      source !== 'SAAVN' && source !== 'JAMENDO'
        ? prisma.track.findMany({
            where: {
              source: 'UPLOAD',
              // SQLite's LIKE is case-insensitive for ASCII out of the box,
              // so we omit mode:'insensitive' (which is Postgres/Mongo only).
              // Switching back to Postgres? Add `mode: 'insensitive'` here.
              OR: [
                { title: { contains: q } },
                { artist: { contains: q } },
                { album: { contains: q } },
              ],
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof prisma.track.findMany>>);

    const [catalogResults, uploadResults] = await Promise.all([catalogPromise, uploadsPromise]);

    return {
      // Field name kept for backwards compat with any cached client code that
      // checks it; semantically it now means "external catalog available".
      jamendoAvailable: catalogResults.available,
      catalogAvailable: catalogResults.available,
      tracks: [
        ...catalogResults.results,
        ...uploadResults.map((t) => ({
          id: t.id,
          source: t.source,
          externalId: t.externalId,
          title: t.title,
          artist: t.artist,
          album: t.album,
          durationSec: t.durationSec,
          coverUrl: t.coverUrl,
          audioUrl: t.audioUrl,
        })),
      ],
    };
  });

  app.get('/tracks/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const track = await prisma.track.findUnique({ where: { id } });
    if (!track) return reply.code(404).send({ error: 'not found' });
    return { track };
  });
}
