'use server';
import {
  SignInFormSchema,
  signInFormSchema,
} from '@/app/auth/signin/signin-form-schema';
import {WRONG_LOGIN_OR_PASSWORD_ERROR} from '@/lib/auth/const';
import {setSessionTokenCookie} from '@/lib/auth/cookies';
import {createSession, generateSessionToken} from '@/lib/auth/session';
import {authClient} from '@/lib/grpc/client';
import {logRequest} from '@/lib/util/log';

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
  logRequest('signIn');
  const validatedFields = signInFormSchema.safeParse(unsafeData);
  if (!validatedFields.success) {
    return AUTH_FAILED;
  }
  const {login, password} = validatedFields.data;
  const {response: auth} = await authClient.authenticate({login, password});
  if (!auth.ok) {
    return AUTH_FAILED;
  }
  // Auth OK, set session.
  logRequest('signIn', `success by ${login}`);
  const token = generateSessionToken();
  const expiration = await createSession(token, auth.userId);
  await setSessionTokenCookie(token, expiration);
  return AUTH_OK;
}
