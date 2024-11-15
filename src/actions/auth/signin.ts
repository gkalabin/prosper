'use server';
import {
  SignInFormSchema,
  signInFormSchema,
} from '@/app/auth/signin/signin-form-schema';
import {COOKIE_TTL_DAYS, WRONG_LOGIN_OR_PASSWORD_ERROR} from '@/lib/auth/const';
import {setSessionTokenCookie} from '@/lib/auth/cookies';
import {
  cleanUpExpiredSessions,
  createSession,
  generateSessionToken,
} from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import {addDays} from 'date-fns';

const AUTH_FAILED = {
  success: false as const,
  error: WRONG_LOGIN_OR_PASSWORD_ERROR,
};

const AUTH_OK = {
  success: true as const,
};

export async function signIn(
  unsafeData: SignInFormSchema
): Promise<{success: true} | {success: false; error: string}> {
  const validatedFields = signInFormSchema.safeParse(unsafeData);
  if (!validatedFields.success) {
    return AUTH_FAILED;
  }
  const {login, password} = validatedFields.data;
  const dbUser = await prisma.user.findUnique({where: {login}});
  if (!dbUser) {
    return AUTH_FAILED;
  }
  const passwordsMatch = await bcrypt.compare(password, dbUser.password);
  if (!passwordsMatch) {
    return AUTH_FAILED;
  }
  // Auth OK, set session.
  const token = generateSessionToken();
  const expiration = addDays(new Date(), COOKIE_TTL_DAYS);
  await createSession(token, dbUser.id, expiration);
  setSessionTokenCookie(token, expiration);
  // Client request is now done, clean up expired sessions,
  // but don't fail the request as it's not critical for the sign in.
  try {
    await cleanUpExpiredSessions();
  } catch (error) {
    console.warn('Failed to clean up expired sessions', error);
  }
  return AUTH_OK;
}
