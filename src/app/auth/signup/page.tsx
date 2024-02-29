import {SignUpForm} from '@/app/auth/signup/SignUpForm';
import {Metadata} from 'next';
import {getServerSession} from 'next-auth';
import {redirect} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Signup - Prosper',
};

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    return redirect('/overview');
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
