import {hasCapacityToSignUp} from '@/actions/auth/signup';
import {SignUpForm} from '@/app/auth/signup/SignUpForm';
import {DEFAULT_AUTHENTICATED_PAGE} from '@/lib/auth/const';
import {getCurrentSession} from '@/lib/auth/user';
import {ExclamationTriangleIcon} from '@heroicons/react/24/outline';
import {Metadata} from 'next';
import {redirect} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Signup - Prosper',
};

export default async function LoginPage() {
  const {user} = await getCurrentSession();
  if (user) {
    return redirect(DEFAULT_AUTHENTICATED_PAGE);
  }
  const hasCapacity = await hasCapacityToSignUp();
  if (!hasCapacity) {
    return <NoCapacityError />;
  }
  return (
    <div className="flex h-full w-full justify-center">
      <main className="mx-8 mt-24 w-[360px] place-self-center rounded-md border border-indigo-300 p-8 shadow-md">
        <section>
          <h1 className="mb-8 text-center text-2xl font-bold leading-9 tracking-tight text-indigo-900">
            Prosper
          </h1>
          <h2 className="mb-8 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Register new account
          </h2>
        </section>

        <SignUpForm />
      </main>
    </div>
  );
}

function NoCapacityError() {
  return (
    <div className="m-6 rounded border bg-red-300 p-4 font-medium">
      <ExclamationTriangleIcon className="mr-2 inline-block h-6 w-6" /> New
      registrations not allowed.
    </div>
  );
}
