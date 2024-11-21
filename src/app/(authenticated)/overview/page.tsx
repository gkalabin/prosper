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
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  const hideBalances = shouldHideBalances();
  return <OverviewPage dbData={data} hideBalances={hideBalances} />;
}
