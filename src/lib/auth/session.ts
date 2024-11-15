import {COOKIE_TTL_DAYS} from '@/lib/auth/const';
import prisma from '@/lib/prisma';
import {sha256} from '@oslojs/crypto/sha2';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import type {Session as DBSession} from '@prisma/client';
import {addDays, differenceInDays, isBefore} from 'date-fns';
import {experimental_taintObjectReference} from 'react';

export type SessionValidationResult =
  | {
      user: {
        id: number;
        login: string;
      };
      session: DBSession;
    }
  | {user: null; session: null};

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

export async function createSession(
  token: string,
  userId: number,
  expiresAt: Date
): Promise<void> {
  const tokenHash = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: DBSession = {
    id: tokenHash,
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
  const tokenHash = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const result = await prisma.session.findUnique({
    where: {
      id: tokenHash,
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
    await prisma.session.delete({where: {id: tokenHash}});
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
  experimental_taintObjectReference('db session', session);
  return {
    user: {
      id: user.id,
      login: user.login,
    },
    session,
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.delete({where: {id: sessionId}});
}

export async function cleanUpExpiredSessions(): Promise<void> {
  const now = new Date();
  await prisma.session.deleteMany({where: {expiresAt: {lt: now}}});
}
