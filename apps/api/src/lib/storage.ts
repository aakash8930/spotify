// S3-compatible object storage. Works with Cloudflare R2 (default for prod),
// MinIO (default for local dev via docker-compose), or any other S3 endpoint.
//
// Audio + cover art are uploaded once at upload time and never re-fetched —
// audioUrl/coverUrl in the DB point at the public bucket URL directly. We
// don't presign reads in v1 because it complicates `<audio src>` and HLS
// later. Buckets that need to stay private must use signed URLs; not yet.
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env, storageConfigured } from '../env.js';

const endpoint = env.S3_ENDPOINT ?? (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

let _client: S3Client | null = null;

export function s3() {
  if (!storageConfigured) {
    throw new Error('Object storage is not configured. Set R2_* or S3_ENDPOINT in .env');
  }
  if (_client) return _client;
  _client = new S3Client({
    region: env.S3_REGION,
    endpoint,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
    // path-style is required for MinIO; R2 supports both. Always-on is safe.
    forcePathStyle: Boolean(env.S3_ENDPOINT),
  });
  return _client;
}

// In dev (MinIO) we auto-create the bucket and set a public-read policy so
// audio URLs Just Work. R2 buckets are created via the dashboard once.
export async function ensureBucket(log: { info: (m: string) => void; warn: (m: string) => void }) {
  if (!storageConfigured) {
    log.warn('Storage not configured — uploads disabled. Set R2_* in .env to enable.');
    return;
  }
  const Bucket = env.R2_BUCKET;
  try {
    await s3().send(new HeadBucketCommand({ Bucket }));
    log.info(`Storage bucket "${Bucket}" ready`);
  } catch {
    try {
      await s3().send(new CreateBucketCommand({ Bucket }));
      // MinIO accepts AWS S3 bucket policies. Set anonymous read on objects
      // so the browser can play audio with a plain <audio src=...>.
      if (env.S3_ENDPOINT) {
        const Policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${Bucket}/*`],
            },
          ],
        });
        await s3()
          .send(new PutBucketPolicyCommand({ Bucket, Policy }))
          .catch(() => {});
      }
      log.info(`Storage bucket "${Bucket}" created`);
    } catch (e) {
      log.warn(`Could not create bucket "${Bucket}": ${(e as Error).message}`);
    }
  }
}

export async function putObject(opts: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  await s3().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return publicUrl(opts.key);
}

export async function deleteObject(key: string) {
  await s3()
    .send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }))
    .catch(() => {});
}

export function publicUrl(key: string): string {
  const base = env.R2_PUBLIC_URL?.replace(/\/$/, '');
  if (base) return `${base}/${key}`;
  // Fallback: MinIO path-style URL (won't work for R2 without R2_PUBLIC_URL).
  if (env.S3_ENDPOINT) return `${env.S3_ENDPOINT.replace(/\/$/, '')}/${env.R2_BUCKET}/${key}`;
  return key;
}
