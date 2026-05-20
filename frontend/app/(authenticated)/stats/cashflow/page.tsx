import {CashflowPage} from '@/app/(authenticated)/stats/cashflow/CashflowPage';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Cashflow - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const data = await fetchAppData(auth);
  return <CashflowPage dbData={data} />;
}
