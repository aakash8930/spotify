import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Postgres connection string OR a Prisma SQLite URL like "file:./dev.db".
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  API_ORIGIN: z.string().url().default('http://localhost:4000'),
  PORT: z.coerce.number().int().positive().default(4000),
  JAMENDO_CLIENT_ID: z.string().optional(),
  // Catalog provider (Saavn-compatible API). Override if the default mirror
  // is down or you self-host. Many community deployments exist; see
  // apps/api/src/lib/saavn.ts for examples.
  SAAVN_API_BASE: z.string().url().default('https://saavn.dev/api'),
  // Object storage. R2_* presence picks the production path; otherwise we fall
  // back to MinIO at the docker-compose default. Set R2_PUBLIC_URL to the
  // bucket's public hostname so audio URLs we hand to the browser are
  // playable without further auth.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default('resonate-tracks'),
  R2_PUBLIC_URL: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  REDIS_URL: z.string().optional(),
});

export const env = Env.parse(process.env);
export type Env = z.infer<typeof Env>;

export const storageConfigured = Boolean(
  (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ACCOUNT_ID) || env.S3_ENDPOINT,
);

