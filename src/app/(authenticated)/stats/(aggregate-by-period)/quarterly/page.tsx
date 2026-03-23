import {QuarterlyStatsPage} from '@/app/(authenticated)/stats/(aggregate-by-period)/quarterly/QuarterlyStatsPage';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Quarterly - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const data = await fetchAppData(auth);
  return <QuarterlyStatsPage dbData={data} />;
}
