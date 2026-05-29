import { z } from 'zod';

export const SignupInput = z.object({
  email: z.string().email().max(254),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, 'letters, numbers, and underscores only'),
  password: z.string().min(8).max(128),
});
export type SignupInput = z.infer<typeof SignupInput>;

export const LoginInput = z.object({
  emailOrUsername: z.string().min(3).max(254),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const PublicUser = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string(),
});
export type PublicUser = z.infer<typeof PublicUser>;
