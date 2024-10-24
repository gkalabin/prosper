'use client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useSearchParams} from 'next/navigation';

export function SignInForm({csrf}: {csrf: string}) {
  const error = useSearchParams().get('error');
  const wrongLoginOrPassword = error == 'CredentialsSignin';
  const otherError = error && !wrongLoginOrPassword;
  return (
    <form method="post" action="/api/auth/callback/credentials">
      <div>
        <label
          htmlFor="login"
          className="block text-sm font-medium text-gray-700"
        >
          Login
        </label>
        <Input type="text" id="login" name="login" className="block w-full" />
      </div>
      <div className="mt-4">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <Input
          type="password"
          id="password"
          name="password"
          className="block w-full"
        />
      </div>
      <input name="csrfToken" type="hidden" defaultValue={csrf} />
      {wrongLoginOrPassword && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          Login or password is incorrect.
        </p>
      )}
      {otherError && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          Something went wrong. Please try again.
        </p>
      )}
      <Button type="submit" className="mt-6 w-full">
        Sign in
      </Button>
    </form>
  );
}
