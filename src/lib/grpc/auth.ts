import {AuthContext} from '@/lib/auth/user';

// withAuth injects the session id from the auth context onto a gRPC
// Request message. Every authenticated Request type has a sessionId
// field that the backend interceptor reads to look up the user.
export function withAuth<T extends {sessionId: string}>(
  req: Omit<T, 'sessionId'>,
  auth: AuthContext
): T {
  return {...req, sessionId: auth.sessionId} as T;
}
