import {OverviewPage} from '@/app/(authenticated)/overview/OverviewPage';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {HIDE_BALANCES_COOKIE_NAME} from '@/lib/const';
import {fetchAppData} from '@/lib/db';
import {fetchOpenBankingConnectionStatus} from '@/lib/db/fetch';
import {logRequest} from '@/lib/util/log';
import {Metadata} from 'next';
import {cookies} from 'next/headers';

export const metadata: Metadata = {
  title: 'Overview - Prosper',
};

async function shouldHideBalances() {
  const cookieStore = await cookies();
  return cookieStore.get(HIDE_BALANCES_COOKIE_NAME)?.value === 'true';
}

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  logRequest('overview', `userId:${auth.userId}`);
  console.time(`[overview] db fetch for userId:${auth.userId}`);
  const [data, connectionStatus] = await Promise.all([
    fetchAppData(auth),
    fetchOpenBankingConnectionStatus(auth),
  ]);
  console.timeEnd(`[overview] db fetch for userId:${auth.userId}`);
  const hideBalances = await shouldHideBalances();
  console.time(`[overview] render for userId:${auth.userId}`);
  const result = (
    <OverviewPage
      dbData={data}
      connectionStatus={connectionStatus}
      hideBalances={hideBalances}
    />
  );
  console.timeEnd(`[overview] render for userId:${auth.userId}`);
  return result;
}
