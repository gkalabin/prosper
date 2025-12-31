import {hasCapacityToSignUp} from '@/actions/auth/signup';
import {SignInForm} from '@/app/auth/signin/SignInForm';
import {DEFAULT_AUTHENTICATED_PAGE} from '@/lib/auth/const';
import {getCurrentSession} from '@/lib/auth/user';
import {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Login - Prosper',
};

export default async function LoginPage() {
  const {user} = await getCurrentSession();
  if (user) {
    return redirect(DEFAULT_AUTHENTICATED_PAGE);
  }
  const hasCapacity = await hasCapacityToSignUp();
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

        <SignInForm />

        {hasCapacity && (
          <p className="mt-10 text-center text-sm text-gray-500">
            Not registered?{' '}
            <Link
              href="/auth/signup"
              className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
            >
              Create a new account
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}
