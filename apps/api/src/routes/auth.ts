import type { FastifyInstance } from 'fastify';
import { hash, verify } from '@node-rs/argon2';
import { createId } from '@paralleldrive/cuid2';
import { prisma, Prisma } from '@resonate/db';
import { LoginInput, SignupInput } from '@resonate/shared/auth';
import {
  SESSION_COOKIE,
  createSession,
  invalidateSession,
  sessionCookieOptions,
} from '../lib/session.js';

const ARGON_OPTS = { memoryCost: 19_456, timeCost: 2, outputLen: 32, parallelism: 1 };

const toPublicUser = (u: {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}) => ({
  id: u.id,
  email: u.email,
  username: u.username,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl,
  createdAt: u.createdAt.toISOString(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/signup', async (req, reply) => {
    const parsed = SignupInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { email, username, password } = parsed.data;
    const passwordHash = await hash(password, ARGON_OPTS);

    try {
      const user = await prisma.user.create({
        data: { id: createId(), email, username, passwordHash },
      });
      const { token, expiresAt } = await createSession(user.id);
      reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
      return { user: toPublicUser(user) };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'email or username already in use' });
      }
      throw e;
    }
  });

  app.post('/auth/login', async (req, reply) => {
    const parsed = LoginInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { emailOrUsername, password } = parsed.data;
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername }],
      },
    });
    // Verify even on missing user to avoid timing-based username enumeration.
    const ok = user
      ? await verify(user.passwordHash, password, ARGON_OPTS)
      : await verify(
          '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          password,
          ARGON_OPTS,
        ).catch(() => false);

    if (!user || !ok) {
      return reply.code(401).send({ error: 'invalid credentials' });
    }

    const { token, expiresAt } = await createSession(user.id);
    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return { user: toPublicUser(user) };
  });

  app.post('/auth/logout', async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await invalidateSession(token);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/auth/me', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'unauthorized' });
    return { user: toPublicUser(req.user) };
  });
}
