import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getUserByEmail } from '@/lib/store';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let email: string;
  let password: string;

  try {
    const body = await request.json();
    email = (body.email ?? '').trim().toLowerCase();
    password = body.password ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const INVALID_MSG = 'Invalid email or password';

  if (!email || !password) {
    return NextResponse.json({ error: INVALID_MSG }, { status: 401 });
  }

  const user = getUserByEmail(email);
  if (!user) {
    // Still run bcrypt to prevent timing attacks
    await bcrypt.compare(password, '$2a$10$placeholder.hash.to.prevent.timing.attacks.xxxxx');
    return NextResponse.json({ error: INVALID_MSG }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: INVALID_MSG }, { status: 401 });
  }

  const token = await signToken({ sub: user.id, email: user.email });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      llmUsesRemaining: user.llmUsesRemaining,
    },
  });
}
