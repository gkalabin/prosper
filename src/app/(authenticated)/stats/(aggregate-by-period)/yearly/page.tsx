import {YearlyStatsPage} from '@/app/(authenticated)/stats/(aggregate-by-period)/yearly/YearlyStatsPage';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Yearly - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const data = await fetchAppData(auth);
  return <YearlyStatsPage dbData={data} />;
}
