import {SignInForm} from '@/app/auth/signin/SignInForm';
import {DEFAULT_AUTHENTICATED_PAGE} from '@/lib/const';
import {Metadata} from 'next';
import {getServerSession} from 'next-auth';
import {getCsrfToken} from 'next-auth/react';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Login - Prosper',
};

function NoCsrfTokenError() {
  return (
    <p className="text-lg text-red-500">
      Failed to render the login form. Try refreshing the page.
    </p>
  );
}

export default async function LoginPage() {
  const csrfToken = await getCsrfToken({
    req: {
      headers: {
        cookie: cookies().toString(),
      },
    },
  });
  if (!csrfToken) {
    return <NoCsrfTokenError />;
  }
  const session = await getServerSession();
  if (session) {
    return redirect(DEFAULT_AUTHENTICATED_PAGE);
  }
  return (
    <div className="flex h-full w-full justify-center">
      <main className="mx-8 mt-24 w-[360px] place-self-center rounded-md border border-indigo-300 p-8 shadow-md">
        <section>
          <h1 className="mb-8 text-center text-2xl font-bold leading-9 tracking-tight text-indigo-900">
            Prosper
          </h1>
          <h2 className="mb-8 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Sign in to your account
          </h2>
        </section>

        <SignInForm csrf={csrfToken} />

        <p className="mt-10 text-center text-sm text-gray-500">
          Not registered?{' '}
          <a
            href="/auth/signup"
            className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
          >
            Create a new account
          </a>
        </p>
      </main>
    </div>
  );
}
