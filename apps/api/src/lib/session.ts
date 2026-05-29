// Lightweight session implementation modeled on Lucia v3's API but without the
// extra dependency. A session is a 40-char random token; we store its SHA-256
// hash in Postgres so a DB leak doesn't expose live session tokens.
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@resonate/db';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function validateSession(token: string | undefined) {
  if (!token) return null;
  const id = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }

  // Sliding expiration: if the session is closer than the threshold to expiring,
  // bump it forward so active users don't get logged out unexpectedly.
  if (session.expiresAt.getTime() - Date.now() < SESSION_REFRESH_THRESHOLD_MS) {
    const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session.update({ where: { id }, data: { expiresAt: newExpiresAt } });
    session.expiresAt = newExpiresAt;
  }

  return { user: session.user, expiresAt: session.expiresAt };
}

export async function invalidateSession(token: string) {
  await prisma.session.delete({ where: { id: hashToken(token) } }).catch(() => {});
}

export const SESSION_COOKIE = 'resonate_session';
export const sessionCookieOptions = (expiresAt: Date) =>
  ({
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  }) as const;
