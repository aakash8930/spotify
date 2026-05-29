import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { User } from '@resonate/db';
import { SESSION_COOKIE, validateSession } from '../lib/session.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
  }
}

export const authPlugin = fp(async (app) => {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (req) => {
    const token = req.cookies[SESSION_COOKIE];
    const result = await validateSession(token);
    req.user = result?.user ?? null;
  });

  app.decorate('requireAuth', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
