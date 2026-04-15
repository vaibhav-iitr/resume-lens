import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  llmUsesRemaining: number;
  createdAt: string;
}

interface StoreData {
  users: Record<string, User>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function readStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_PATH)) {
      return { users: {} };
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as StoreData;
  } catch {
    return { users: {} };
  }
}

function writeStore(data: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getUserByEmail(email: string): User | null {
  const store = readStore();
  const user = Object.values(store.users).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  return user ?? null;
}

export function getUserById(id: string): User | null {
  const store = readStore();
  return store.users[id] ?? null;
}

export function createUser(email: string, passwordHash: string): User {
  const store = readStore();
  const id = randomUUID();
  const user: User = {
    id,
    email,
    passwordHash,
    llmUsesRemaining: 3,
    createdAt: new Date().toISOString(),
  };
  store.users[id] = user;
  writeStore(store);
  return user;
}

export function decrementLLMUse(id: string): User | null {
  const store = readStore();
  const user = store.users[id];
  if (!user) return null;
  if (user.llmUsesRemaining <= 0) return user;
  user.llmUsesRemaining -= 1;
  store.users[id] = user;
  writeStore(store);
  return user;
}
