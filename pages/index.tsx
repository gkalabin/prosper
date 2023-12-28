import Layout from "components/Layout";
import { useSession } from "next-auth/react";

export default function Index() {
  const { data: session } = useSession();

  return (
    <Layout>
      <div className="mt-20 flex justify-center">
        <div className="md:w-2/3">
          <div>
            <span className="text-6xl text-indigo-600">Spent</span>
            <span className="text-normal text-indigo-400">
              another spending tracker
            </span>
          </div>
          {(session?.user?.name && <>Logged in as {session.user.name}</>) || (
            <>Not logged in</>
          )}
        </div>
      </div>
    </Layout>
  );
}
