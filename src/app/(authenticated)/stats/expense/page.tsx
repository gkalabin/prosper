import {ExpensePage} from '@/app/(authenticated)/stats/expense/ExpensePage';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Expense - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const data = await fetchAppData(auth);
  return <ExpensePage dbData={data} />;
}
