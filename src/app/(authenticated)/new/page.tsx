import {NewTransactionForm} from '@/app/(authenticated)/new/client';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {logRequest} from '@/lib/util/log';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'New Transaction - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  logRequest('new:page', `userId:${auth.userId}`);
  const data = await fetchAppData(auth);
  return <NewTransactionForm dbData={data} />;
}
