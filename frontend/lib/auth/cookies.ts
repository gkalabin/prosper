import {COOKIE_NAME} from '@/lib/auth/const';
import {isProd, isUsingHTTP} from '@/lib/util/env';
import {cookies} from 'next/headers';

export async function setSessionTokenCookie(
  token: string,
  expiresAt: Date
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax' as const,
    // Only use secure cookies if running on https.
    secure: isProd() && !isUsingHTTP(),
    expires: expiresAt,
    path: '/',
  });
}

export async function deleteSessionTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd() && !isUsingHTTP(),
    maxAge: 0,
    path: '/',
  });
}
