import {COOKIE_NAME, REQUESTED_PATH_HEADER} from '@/lib/auth/const';
import {signInUrlWithReturnPath} from '@/lib/auth/redirect';
import {
  SessionValidationResult,
  validateSessionToken,
} from '@/lib/auth/session';
import {cookies, headers} from 'next/headers';
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
    return redirectToSignIn();
  }
  return {userId: user.id, sessionId: session.id};
}

// Sends the user to the sign-in page, preserving the path they were visiting so
// they can be returned to it after authenticating.
export async function redirectToSignIn(): Promise<never> {
  const requestedPath = (await headers()).get(REQUESTED_PATH_HEADER);
  return redirect(signInUrlWithReturnPath(requestedPath));
}

export async function getCurrentSession(): Promise<SessionValidationResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return {user: null, session: null};
  }
  return await validateSessionToken(token);
}
