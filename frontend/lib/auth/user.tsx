import {COOKIE_NAME, SIGN_IN_URL} from '@/lib/auth/const';
import {
  SessionValidationResult,
  validateSessionToken,
} from '@/lib/auth/session';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

// AuthContext carries the data the frontend needs to make authenticated
// gRPC calls on behalf of the user: the userId (for cache partitioning)
// and the sessionId (sent as the session-id metadata header).
export type AuthContext = {
  userId: number;
  sessionId: string;
};

export async function getAuthContextOrRedirect(): Promise<AuthContext> {
  const {user, session} = await getCurrentSession();
  if (!user || !session) {
    return redirect(SIGN_IN_URL);
  }
  return {userId: user.id, sessionId: session.id};
}

export async function getCurrentSession(): Promise<SessionValidationResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return {user: null, session: null};
  }
  return await validateSessionToken(token);
}
