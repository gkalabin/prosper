import {SESSION_TOKEN_LENGTH} from '@/lib/auth/const';
import {setSessionTokenCookie} from '@/lib/auth/cookies';
import {authClient} from '@/lib/grpc/client';
import {timestampToDate} from '@/lib/grpc/timestamp';

export type SessionValidationResult =
  | {
      user: {
        id: number;
        login: string;
      };
      session: {
        id: string;
      };
    }
  | {user: null; session: null};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSessionToken(): string {
  const array = new Uint8Array(SESSION_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return bytesToHex(array);
}

export async function hashSessionToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

export async function createSession(
  token: string,
  userId: number
): Promise<Date> {
  const sessionId = await hashSessionToken(token);
  const {response} = await authClient.createSession({sessionId, userId});
  return timestampToDate(response.expiresAt);
}

export async function validateSessionToken(
  token: string
): Promise<SessionValidationResult> {
  const sessionId = await hashSessionToken(token);
  const {response} = await authClient.validateSession({sessionId});
  if (!response.valid) {
    return {user: null, session: null};
  }
  // Backend may have slid the expiry forward; re-issue the cookie so the
  // browser tracks the new value.
  if (response.extendedExpiresAt) {
    await setSessionTokenCookie(
      token,
      timestampToDate(response.extendedExpiresAt)
    );
  }
  return {
    user: {id: response.userId, login: response.userLogin},
    session: {id: sessionId},
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await authClient.deleteSession({sessionId});
}
