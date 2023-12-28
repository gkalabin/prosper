import { SessionProvider, useSession } from "next-auth/react";
import "styles/global.css";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}) {
  return (
    <SessionProvider session={session}>
      {Component.noAuthenticationRequired ? (
        <Component {...pageProps} />
      ) : (
        <AuthOnly>
          <Component {...pageProps} />
        </AuthOnly>
      )}
    </SessionProvider>
  );
}

function AuthOnly({ children }) {
  // if `{ required: true }` is supplied, `status` can only be "loading" or "authenticated"
  const { status } = useSession({ required: true });

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return children;
}
