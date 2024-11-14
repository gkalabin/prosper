import {IncomePage} from '@/app/(authenticated)/stats/income/IncomePage';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Income - Prosper',
};

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <IncomePage dbData={data} />;
}
