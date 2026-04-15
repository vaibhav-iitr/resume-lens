import { SignJWT, jwtVerify } from 'jose';

export interface AuthPayload {
  sub: string;
  email: string;
}

export const COOKIE_NAME = 'rl_auth';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function signToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      return null;
    }
    return { sub: payload.sub, email: payload.email as string };
  } catch {
    return null;
  }
}
