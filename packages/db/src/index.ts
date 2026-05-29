import { PrismaClient } from '@prisma/client';

// Re-export the generated client and types so the rest of the monorepo only
// imports from `@resonate/db` rather than `@prisma/client` directly.
export * from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
