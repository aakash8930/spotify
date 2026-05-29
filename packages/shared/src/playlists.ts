import { z } from 'zod';
import { Track } from './tracks.js';

export const Playlist = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().url().nullable(),
  ownerId: z.string(),
  isPublic: z.boolean(),
  trackCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Playlist = z.infer<typeof Playlist>;

export const PlaylistWithTracks = Playlist.extend({
  tracks: z.array(Track),
});
export type PlaylistWithTracks = z.infer<typeof PlaylistWithTracks>;

export const CreatePlaylistInput = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});
export type CreatePlaylistInput = z.infer<typeof CreatePlaylistInput>;

export const UpdatePlaylistInput = CreatePlaylistInput.partial();
export type UpdatePlaylistInput = z.infer<typeof UpdatePlaylistInput>;

export const AddTrackToPlaylistInput = z.object({
  trackId: z.string(),
  position: z.number().int().nonnegative().optional(),
});
export type AddTrackToPlaylistInput = z.infer<typeof AddTrackToPlaylistInput>;
