import {CashflowPage} from '@/app/(authenticated)/stats/cashflow/CashflowPage';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Cashflow - Prosper',
};

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <CashflowPage dbData={data} />;
}
