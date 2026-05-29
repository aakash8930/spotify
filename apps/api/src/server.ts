import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './env.js';
import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { trackRoutes } from './routes/tracks.js';
import { uploadRoutes } from './routes/uploads.js';
import { playlistRoutes } from './routes/playlists.js';
import { likeRoutes } from './routes/likes.js';
import { libraryRoutes } from './routes/library.js';
import { roomRoutes } from './routes/rooms.js';
import { proxyRoutes } from './routes/proxy.js';
import { ensureBucket } from './lib/storage.js';
import { attachRealtime } from './realtime/gateway.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
        : undefined,
  },
});

await app.register(cors, {
  // In dev, accept any origin so phones/tablets on the same Wi-Fi can hit
  // the API too. `origin: true` echoes the request's Origin header back,
  // which is the only way credentialed CORS works without a wildcard.
  // In prod we lock down to WEB_ORIGIN.
  origin: env.NODE_ENV === 'production' ? env.WEB_ORIGIN : true,
  credentials: true,
});
await app.register(cookie, { secret: env.SESSION_SECRET });
await app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB per file — generous for MP3, conservative for FLAC
    files: 1,
  },
});
await app.register(authPlugin);

app.get('/health', async () => ({ ok: true, time: new Date().toISOString() }));

await app.register(authRoutes, { prefix: '/api' });
await app.register(trackRoutes, { prefix: '/api' });
await app.register(uploadRoutes, { prefix: '/api' });
await app.register(playlistRoutes, { prefix: '/api' });
await app.register(likeRoutes, { prefix: '/api' });
await app.register(libraryRoutes, { prefix: '/api' });
await app.register(roomRoutes, { prefix: '/api' });
await app.register(proxyRoutes, { prefix: '/api' });

await ensureBucket(app.log);

const port = env.PORT;
app.listen({ port, host: '0.0.0.0' }).then(async () => {
  await attachRealtime(app);
  app.log.info(`Resonate API ready on http://localhost:${port}`);
});
