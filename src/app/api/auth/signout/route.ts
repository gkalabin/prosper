import {SIGN_IN_URL} from '@/lib/auth/const';
import {deleteSessionTokenCookie} from '@/lib/auth/cookies';
import {invalidateSession} from '@/lib/auth/session';
import {getCurrentSession} from '@/lib/auth/user';
import {redirect} from 'next/navigation';

async function invalidateCurrentSession(): Promise<void> {
  const {session} = await getCurrentSession();
  if (!session) {
    return;
  }
  await invalidateSession(session.id);
  await deleteSessionTokenCookie();
  return;
}

export async function GET(): Promise<Response> {
  await invalidateCurrentSession();
  return redirect(SIGN_IN_URL);
}
