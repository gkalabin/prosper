import {TransactionsPage} from '@/app/(authenticated)/transactions/TransactionsPage';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {logRequest} from '@/lib/util/log';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Transactions - Prosper',
};

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  logRequest('transactions', `userId:${userId}`);
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <TransactionsPage dbData={data} />;
}
