import {MonthlyStatsPage} from '@/app/(authorised)/stats/(aggregate-by-period)/monthly/MonthlyStatsPage';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {getUserId} from '@/lib/user';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Monthly - Prosper',
};

export default async function Page() {
  const userId = await getUserId();
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <MonthlyStatsPage dbData={data} />;
}
