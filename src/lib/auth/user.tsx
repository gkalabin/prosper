import {COOKIE_NAME, SIGN_IN_URL} from '@/lib/auth/const';
import {
  SessionValidationResult,
  validateSessionToken,
} from '@/lib/auth/session';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

export async function getUserIdOrRedirect(): Promise<number> {
  const {user} = await getCurrentSession();
  if (!user) {
    return redirect(SIGN_IN_URL);
  }
  return user.id;
}

export async function getCurrentSession(): Promise<SessionValidationResult> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return {user: null, session: null};
  }
  return await validateSessionToken(token);
}
