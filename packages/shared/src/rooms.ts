import { z } from 'zod';
import { Track } from './tracks.js';

export const CreateRoomInput = z.object({
  name: z.string().min(1).max(60),
  isPublic: z.boolean().default(true),
});
export type CreateRoomInput = z.infer<typeof CreateRoomInput>;

export const RoomMember = z.object({
  userId: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  isHost: z.boolean(),
  joinedAt: z.string(),
});
export type RoomMember = z.infer<typeof RoomMember>;

export const Room = z.object({
  id: z.string(),
  code: z.string(), // 6-char shareable code
  name: z.string(),
  hostId: z.string(),
  isPublic: z.boolean(),
  memberCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type Room = z.infer<typeof Room>;

// Realtime events exchanged over Socket.IO. Server is authoritative — clients
// emit intents (PLAY, PAUSE, SEEK), server validates against host permissions
// then broadcasts the resulting STATE to everyone.
export const RoomPlaybackState = z.object({
  trackId: z.string().nullable(),
  positionSec: z.number().nonnegative(),
  isPlaying: z.boolean(),
  // Server timestamp when this state was emitted; clients use it to correct
  // for network delay when computing the "true" current position.
  serverTimeMs: z.number().int(),
});
export type RoomPlaybackState = z.infer<typeof RoomPlaybackState>;

export const RoomQueueItem = z.object({
  id: z.string(),
  track: Track,
  addedById: z.string(),
  position: z.number().int().nonnegative(),
});
export type RoomQueueItem = z.infer<typeof RoomQueueItem>;

export const ChatMessageInput = z.object({
  body: z.string().min(1).max(500),
});
export type ChatMessageInput = z.infer<typeof ChatMessageInput>;

export const ChatMessage = z.object({
  id: z.string(),
  roomId: z.string(),
  userId: z.string(),
  username: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;
