import {MonthlyStatsPage} from '@/app/(authenticated)/stats/(aggregate-by-period)/monthly/MonthlyStatsPage';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Monthly - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const data = await fetchAppData(auth);
  return <MonthlyStatsPage dbData={data} />;
}
