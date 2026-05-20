import {IncomePage} from '@/app/(authenticated)/stats/income/IncomePage';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Income - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const data = await fetchAppData(auth);
  return <IncomePage dbData={data} />;
}
