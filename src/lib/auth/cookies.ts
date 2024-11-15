import {COOKIE_NAME} from '@/lib/auth/const';
import {isProd} from '@/lib/util/env';
import {cookies} from 'next/headers';

export async function setSessionTokenCookie(
  token: string,
  expiresAt: Date
): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd(),
    expires: expiresAt,
    path: '/',
  });
}

export async function deleteSessionTokenCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    maxAge: 0,
    path: '/',
  });
}
