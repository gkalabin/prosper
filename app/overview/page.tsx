import {OverviewPage} from '@/app/overview/OverviewPage';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {addLatestExchangeRates} from '@/lib/exchangeRatesBackfill';
import {addLatestStockQuotes} from '@/lib/stockQuotesBackfill';
import {getUserId} from '@/lib/user';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Overview - Prosper',
};

export default async function Page() {
  const userId = await getUserId();
  const db = new DB({userId});
  await Promise.all([
    await addLatestExchangeRates(),
    await addLatestStockQuotes(),
  ]);
  const data = await fetchAllDatabaseData(db);
  return <OverviewPage dbData={data} />;
}
