import {COOKIE_TTL_DAYS, SESSION_TOKEN_LENGTH} from '@/lib/auth/const';
import prisma from '@/lib/prisma';
import type {Session as DBSession} from '@prisma/client';
import {addDays, differenceInDays, isBefore} from 'date-fns';

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
  userId: number,
  expiresAt: Date
): Promise<void> {
  const tokenId = await hashSessionToken(token);
  const session: DBSession = {
    id: tokenId,
    userId,
    expiresAt,
  };
  await prisma.session.create({
    data: session,
  });
}

export async function validateSessionToken(
  token: string
): Promise<SessionValidationResult> {
  const tokenId = await hashSessionToken(token);
  const result = await prisma.session.findUnique({
    where: {
      id: tokenId,
    },
    include: {
      user: {
        select: {
          id: true,
          login: true,
        },
      },
    },
  });
  if (result === null) {
    return {user: null, session: null};
  }
  const {user, ...session} = result;
  const now = Date.now();
  if (isBefore(session.expiresAt, now)) {
    await prisma.session.delete({where: {id: tokenId}});
    return {user: null, session: null};
  }
  if (differenceInDays(session.expiresAt, now) < COOKIE_TTL_DAYS / 2) {
    session.expiresAt = addDays(now, COOKIE_TTL_DAYS);
    await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        expiresAt: session.expiresAt,
      },
    });
  }
  return {
    user: {
      id: user.id,
      login: user.login,
    },
    session: {
      id: session.id,
    },
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.delete({where: {id: sessionId}});
}

export async function cleanUpExpiredSessions(): Promise<void> {
  const now = new Date();
  await prisma.session.deleteMany({where: {expiresAt: {lt: now}}});
}
