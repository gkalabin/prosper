import {NewTransactionForm} from '@/app/(authenticated)/new/client';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {logRequest} from '@/lib/util/log';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'New Transaction - Prosper',
};

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  logRequest('new:page', `userId:${userId}`);
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <NewTransactionForm dbData={data} />;
}
