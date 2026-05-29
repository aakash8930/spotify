// Minimal seed: creates a demo user and a single playlist so the app has
// something to render before Jamendo search or uploads exist.
import { createId } from '@paralleldrive/cuid2';
import { hash } from '@node-rs/argon2';
import { prisma } from './index.js';

async function main() {
  const passwordHash = await hash('demo1234', {
    memoryCost: 19_456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@resonate.app' },
    update: {},
    create: {
      id: createId(),
      email: 'demo@resonate.app',
      username: 'demo',
      displayName: 'Demo User',
      passwordHash,
    },
  });

  await prisma.playlist.upsert({
    where: { id: 'seed-welcome' },
    update: {},
    create: {
      id: 'seed-welcome',
      name: 'Welcome to Resonate',
      description: 'Your first playlist. Search Jamendo or upload tracks to fill it.',
      ownerId: user.id,
      isPublic: false,
    },
  });

  console.log('Seeded demo user:', user.email, '(password: demo1234)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
