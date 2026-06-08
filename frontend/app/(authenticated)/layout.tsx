import Header from '@/components/Header';
import {getCurrentSession, redirectToSignIn} from '@/lib/auth/user';

async function getLogin() {
  const {user} = await getCurrentSession();
  if (!user) {
    // Auth is enforced per request by the data-access helpers
    // (getAuthContextOrRedirect). This guards pages which don't call the helpers.
    return redirectToSignIn();
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
      {children}
      {modal}
    </>
  );
}
