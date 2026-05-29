import { z } from 'zod';

export const TrackSource = z.enum(['SAAVN', 'JAMENDO', 'UPLOAD']);
export type TrackSource = z.infer<typeof TrackSource>;

export const Track = z.object({
  id: z.string(),
  source: TrackSource,
  externalId: z.string().nullable(),
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  durationSec: z.number().int().nonnegative(),
  coverUrl: z.string().url().nullable(),
  audioUrl: z.string().url(),
  uploadedById: z.string().nullable(),
  createdAt: z.string(),
});
export type Track = z.infer<typeof Track>;

export const SearchTracksQuery = z.object({
  q: z.string().min(1).max(120),
  source: TrackSource.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type SearchTracksQuery = z.infer<typeof SearchTracksQuery>;

// Multipart upload — the file itself is sent as multipart/form-data; this
// schema validates the accompanying JSON metadata fields.
export const UploadTrackMetadata = z.object({
  title: z.string().min(1).max(200).optional(),
  artist: z.string().min(1).max(200).optional(),
  album: z.string().max(200).optional(),
});
export type UploadTrackMetadata = z.infer<typeof UploadTrackMetadata>;
