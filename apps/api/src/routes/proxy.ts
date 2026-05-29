import type { FastifyInstance } from 'fastify';
import { Readable } from 'node:stream';

// Audio proxy. The JioSaavn CDN serves real MP4/AAC audio but expects a
// Referer header from www.jiosaavn.com — without it the browser gets bytes
// it can't decode (MediaError code 4). Routing playback through our origin
// also sidesteps cross-origin streaming weirdness in some browsers.
//
// We allow only known JioSaavn CDN hostnames so this isn't an open proxy
// for the entire internet.

const ALLOWED_HOSTS = /^([a-z0-9-]+\.)?(saavncdn\.com|jiosaavn\.com)$/i;

export async function proxyRoutes(app: FastifyInstance) {
  app.get('/proxy/audio', async (req, reply) => {
    const raw = (req.query as { url?: string }).url;
    if (!raw) return reply.code(400).send({ error: 'missing url' });

    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return reply.code(400).send({ error: 'invalid url' });
    }
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.test(target.hostname)) {
      return reply.code(403).send({ error: 'host not allowed' });
    }

    // Pass the client's Range header through so <audio> seeking still works.
    const upstream = await fetch(target, {
      headers: {
        Range: req.headers.range ?? 'bytes=0-',
        Referer: 'https://www.jiosaavn.com/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    }).catch((e) => {
      req.log.warn({ err: e }, 'audio proxy upstream failed');
      return null;
    });

    if (!upstream || !upstream.body) {
      return reply.code(502).send({ error: 'upstream unavailable' });
    }

    reply.code(upstream.status);
    const passthrough = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified'];
    for (const h of passthrough) {
      const v = upstream.headers.get(h);
      if (v) reply.header(h, v);
    }
    if (!upstream.headers.get('accept-ranges')) reply.header('accept-ranges', 'bytes');
    reply.header('cache-control', 'public, max-age=3600');

    return reply.send(Readable.fromWeb(upstream.body as never));
  });
}
