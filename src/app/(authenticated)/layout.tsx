import Header from '@/components/Header';
import {SIGN_IN_URL} from '@/lib/auth/const';
import {getCurrentSession} from '@/lib/auth/user';
import {redirect} from 'next/navigation';

async function getLogin() {
  const {user} = await getCurrentSession();
  if (!user) {
    // This is not the main auth check, but a fallback in case user is not authenticated.
    // The real auth check is in middleware.
    return redirect(SIGN_IN_URL);
  }
  return user.login;
}

export default async function Layout({
  modal,
  children,
}: {
  modal: React.ReactNode;
  children: React.ReactNode;
}) {
  const login = await getLogin();
  return (
    <>
      <Header login={login} />
      <div className="space-y-6 p-6">{children}</div>
      {modal}
    </>
  );
}
