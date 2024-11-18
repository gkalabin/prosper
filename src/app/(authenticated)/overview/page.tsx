import {OverviewPage} from '@/app/(authenticated)/overview/OverviewPage';
import {updateRatesFallback} from '@/lib/asset-rates/backfill';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {logRequest} from '@/lib/util/log';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Overview - Prosper',
};

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  logRequest('overview', `userId:${userId}`);
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  await updateRatesFallback(data);
  return <OverviewPage dbData={data} />;
}
