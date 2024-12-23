import {NewTransactionModal} from '@/app/(authenticated)/@modal/modal';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {logRequest} from '@/lib/util/log';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'New Transaction - Prosper',
};

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  logRequest('new:intercepted', `userId:${userId}`);
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <NewTransactionModal dbData={data} />;
}
