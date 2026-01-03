'use server';
import {
  createInitialCategories,
  createInitialDisplaySettings,
} from '@/actions/auth/initial-data';
import {
  SignUpForm,
  signupFormValidationSchema,
} from '@/app/auth/signup/signup-form-schema';
import {COOKIE_TTL_DAYS, DEFAULT_AUTHENTICATED_PAGE} from '@/lib/auth/const';
import {setSessionTokenCookie} from '@/lib/auth/cookies';
import {createSession, generateSessionToken} from '@/lib/auth/session';
import {getCurrentSession} from '@/lib/auth/user';
import prisma from '@/lib/prisma';
import {logRequest} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import bcrypt from 'bcrypt';
import {addDays} from 'date-fns';
import {redirect} from 'next/navigation';

const genericBadRequest = {
  success: false,
  error: 'Failed to create the user, please try again.',
};

const atCapacityResponse = {
  success: false as const,
  error: 'Maximum number of allowed users reached.',
};

export async function hasCapacityToSignUp(): Promise<boolean> {
  const maxUsers = positiveIntOrNull(
    process.env.MAX_USERS_ALLOWED_TO_REGISTER ?? null
  );
  if (!maxUsers) {
    return false;
  }
  const usersCount = await prisma.user.count();
  return usersCount < maxUsers;
}

export async function signUp(
  unsafeData: SignUpForm
): Promise<{success: true} | {success: false; error: string}> {
  logRequest('signUp');
  // Validate if the user can be created.
  const hasCapacity = await hasCapacityToSignUp();
  if (!hasCapacity) {
    return atCapacityResponse;
  }
  const {user: loggedInUser} = await getCurrentSession();
  if (loggedInUser) {
    return redirect(DEFAULT_AUTHENTICATED_PAGE);
  }
  const parsed = signupFormValidationSchema.safeParse(unsafeData);
  if (!parsed.success) {
    return genericBadRequest;
  }
  const {login, password} = parsed.data;
  // Create the user.
  const rounds = 10 + Math.round(5 * Math.random());
  // This is a heavy operation, make sure to run it outside of the transaction.
  const passwordHash = await bcrypt.hash(password, rounds);
  const txResult = await prisma.$transaction(async tx => {
    const existingUser = await tx.user.findFirst({where: {login}});
    if (existingUser) {
      return {
        user: null,
        error: 'User with this login already exists.',
      };
    }
    const user = await tx.user.create({
      data: {
        login,
        password: passwordHash,
      },
    });
    await createInitialCategories(tx, user);
    await createInitialDisplaySettings(tx, user);
    return {user, error: null};
  });
  if (!txResult.user) {
    return {success: false, error: txResult.error};
  }
  const dbUser = txResult.user;
  // User successfully created. Add new session.
  logRequest('signUp', `success by ${login}`);
  const token = generateSessionToken();
  const expiration = addDays(new Date(), COOKIE_TTL_DAYS);
  await createSession(token, dbUser.id, expiration);
  setSessionTokenCookie(token, expiration);
  return {success: true};
}
