'use server';
import {
  SignUpForm,
  signupFormValidationSchema,
} from '@/app/auth/signup/signup-form-schema';
import {DEFAULT_AUTHENTICATED_PAGE} from '@/lib/auth/const';
import {setSessionTokenCookie} from '@/lib/auth/cookies';
import {createSession, generateSessionToken} from '@/lib/auth/session';
import {getCurrentSession} from '@/lib/auth/user';
import {authClient} from '@/lib/grpc/client';
import {logRequest} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
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
    process.env.PROSPER_MAX_USERS_ALLOWED_TO_REGISTER ?? null
  );
  if (!maxUsers) {
    return false;
  }
  const {response} = await authClient.countUsers({});
  return response.count < maxUsers;
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
  const {response: registration} = await authClient.register({login, password});
  if (!registration.ok) {
    return {
      success: false,
      error: registration.error || genericBadRequest.error,
    };
  }
  logRequest('signUp', `success by ${login}`);
  const token = generateSessionToken();
  const expiration = await createSession(token, registration.userId);
  await setSessionTokenCookie(token, expiration);
  return {success: true};
}
