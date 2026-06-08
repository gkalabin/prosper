import {hasCapacityToSignUp} from '@/actions/auth/signup';
import {SignInForm} from '@/app/auth/signin/SignInForm';
import {RETURN_PATH_PARAM} from '@/lib/auth/const';
import {returnPathOrDefault} from '@/lib/auth/redirect';
import {getCurrentSession} from '@/lib/auth/user';
import {firstValueOrNull} from '@/lib/util/searchParams';
import {Metadata} from 'next';
import {redirect} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Login - Prosper',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{[key: string]: string | string[] | undefined}>;
}) {
  const resolvedSearchParams = await searchParams;
  const unsafeReturnPath = firstValueOrNull(
    resolvedSearchParams[RETURN_PATH_PARAM]
  );
  const safeReturnPath = returnPathOrDefault(unsafeReturnPath);
  const {user} = await getCurrentSession();
  if (user) {
    return redirect(safeReturnPath);
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

        <SignInForm nextPage={safeReturnPath} />

        {hasCapacity && (
          <p className="mt-10 text-center text-sm text-gray-500">
            Not registered?{' '}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/auth/signup"
              className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
            >
              Create a new account
            </a>
          </p>
        )}
      </main>
    </div>
  );
}
