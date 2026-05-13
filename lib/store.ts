import { kv } from '@vercel/kv';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  llmUsesRemaining: number;
  createdAt: string;
}

// Keys:
//   user:<id>        → User object
//   email:<email>    → user id  (lookup index)

export async function getUserByEmail(email: string): Promise<User | null> {
  const id = await kv.get<string>(`email:${email.toLowerCase()}`);
  if (!id) return null;
  return kv.get<User>(`user:${id}`);
}

export async function getUserById(id: string): Promise<User | null> {
  return kv.get<User>(`user:${id}`);
}

export async function createUser(email: string, passwordHash: string): Promise<User> {
  const id = randomUUID();
  const user: User = {
    id,
    email: email.toLowerCase(),
    passwordHash,
    llmUsesRemaining: 3,
    createdAt: new Date().toISOString(),
  };
  await Promise.all([
    kv.set(`user:${id}`, user),
    kv.set(`email:${email.toLowerCase()}`, id),
  ]);
  return user;
}

export async function decrementLLMUse(id: string): Promise<User | null> {
  const user = await kv.get<User>(`user:${id}`);
  if (!user) return null;
  if (user.llmUsesRemaining <= 0) return user;
  const updated: User = { ...user, llmUsesRemaining: user.llmUsesRemaining - 1 };
  await kv.set(`user:${id}`, updated);
  return updated;
}
