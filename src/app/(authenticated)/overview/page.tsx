import {OverviewPage} from '@/app/(authenticated)/overview/OverviewPage';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {HIDE_BALANCES_COOKIE_NAME} from '@/lib/const';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {logRequest} from '@/lib/util/log';
import {Metadata} from 'next';
import {cookies} from 'next/headers';

export const metadata: Metadata = {
  title: 'Overview - Prosper',
};

function shouldHideBalances() {
  const cookieStore = cookies();
  return cookieStore.get(HIDE_BALANCES_COOKIE_NAME)?.value === 'true';
}

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  logRequest('overview', `userId:${userId}`);
  console.time(`[overview] db fetch for userId:${userId}`);
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  console.timeEnd(`[overview] db fetch for userId:${userId}`);
  const hideBalances = shouldHideBalances();
  console.time(`[overview] render for userId:${userId}`);
  const result = <OverviewPage dbData={data} hideBalances={hideBalances} />;
  console.timeEnd(`[overview] render for userId:${userId}`);
  return result;
}
