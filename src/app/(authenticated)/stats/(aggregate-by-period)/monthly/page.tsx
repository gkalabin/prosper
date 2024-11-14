import {MonthlyStatsPage} from '@/app/(authenticated)/stats/(aggregate-by-period)/monthly/MonthlyStatsPage';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Monthly - Prosper',
};

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <MonthlyStatsPage dbData={data} />;
}
