import {TransactionsPage} from '@/app/(authenticated)/transactions/TransactionsPage';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {logRequest} from '@/lib/util/log';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Transactions - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  logRequest('transactions', `userId:${auth.userId}`);
  const data = await fetchAppData(auth);
  return <TransactionsPage dbData={data} />;
}
