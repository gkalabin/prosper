import {QuarterlyStatsPage} from '@/app/(authorised)/stats/(aggregate-by-period)/quarterly/QuarterlyStatsPage';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {getUserId} from '@/lib/user';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Quarterly - Prosper',
};

export default async function Page() {
  const userId = await getUserId();
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <QuarterlyStatsPage dbData={data} />;
}
