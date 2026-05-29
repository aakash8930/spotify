import type { FastifyInstance } from 'fastify';
import { Buffer } from 'node:buffer';
import { parseBuffer } from 'music-metadata';
import { createId } from '@paralleldrive/cuid2';
import { prisma } from '@resonate/db';
import { putObject } from '../lib/storage.js';
import { storageConfigured } from '../env.js';

const ALLOWED_AUDIO_MIME = new Set([
  'audio/mpeg', // mp3
  'audio/mp4',
  'audio/x-m4a',
  'audio/flac',
  'audio/x-flac',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
]);

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/tracks/upload', { preHandler: app.requireAuth }, async (req, reply) => {
    if (!storageConfigured) {
      return reply.code(503).send({ error: 'storage not configured' });
    }

    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'no file' });
    if (!ALLOWED_AUDIO_MIME.has(file.mimetype)) {
      return reply.code(415).send({ error: `unsupported audio type: ${file.mimetype}` });
    }

    // Buffer the upload — we need the whole thing for music-metadata anyway,
    // and 50 MB max keeps memory bounded. For larger files we'd switch to
    // presigned PUTs and parse cover/tags out of band.
    const buf = await file.toBuffer();

    let metadata: Awaited<ReturnType<typeof parseBuffer>>;
    try {
      metadata = await parseBuffer(buf, { mimeType: file.mimetype, size: buf.length });
    } catch (e) {
      return reply.code(400).send({ error: `unreadable audio: ${(e as Error).message}` });
    }

    const trackId = createId();
    const ext = guessExt(file.mimetype, file.filename);
    const audioKey = `tracks/${trackId}${ext}`;

    // Optional metadata overrides from the form. Multipart fields ride along
    // the same request — file.fields holds them after .toBuffer() resolves.
    const fields = file.fields as Record<string, { value?: string } | undefined>;
    const titleOverride = fields.title?.value?.trim();
    const artistOverride = fields.artist?.value?.trim();
    const albumOverride = fields.album?.value?.trim();

    const title =
      titleOverride ||
      metadata.common.title ||
      stripExt(file.filename ?? 'Untitled');
    const artist = artistOverride || metadata.common.artist || 'Unknown artist';
    const album = albumOverride || metadata.common.album || null;
    const durationSec = Math.round(metadata.format.duration ?? 0);

    let coverUrl: string | null = null;
    const picture = metadata.common.picture?.[0];
    if (picture) {
      const coverExt = mimeToExt(picture.format) ?? '.jpg';
      const coverKey = `covers/${trackId}${coverExt}`;
      coverUrl = await putObject({
        key: coverKey,
        body: Buffer.from(picture.data),
        contentType: picture.format,
      });
    }

    const audioUrl = await putObject({ key: audioKey, body: buf, contentType: file.mimetype });

    const track = await prisma.track.create({
      data: {
        id: trackId,
        source: 'UPLOAD',
        title,
        artist,
        album,
        durationSec,
        coverUrl,
        audioUrl,
        storageKey: audioKey,
        uploadedById: req.user!.id,
      },
    });

    return { track };
  });
}

const guessExt = (mime: string, filename: string | undefined): string => {
  if (filename) {
    const m = /\.[a-z0-9]+$/i.exec(filename);
    if (m) return m[0]!.toLowerCase();
  }
  if (mime === 'audio/mpeg') return '.mp3';
  if (mime === 'audio/flac' || mime === 'audio/x-flac') return '.flac';
  if (mime === 'audio/wav' || mime === 'audio/x-wav') return '.wav';
  if (mime === 'audio/ogg') return '.ogg';
  if (mime === 'audio/mp4' || mime === 'audio/x-m4a') return '.m4a';
  return '.bin';
};

const mimeToExt = (m: string): string | null => {
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('png')) return '.png';
  if (m.includes('webp')) return '.webp';
  return null;
};

const stripExt = (s: string) => s.replace(/\.[^.]+$/, '');
