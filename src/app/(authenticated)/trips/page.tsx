import {TripsList} from '@/app/(authenticated)/trips/TripsList';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Trips - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const data = await fetchAppData(auth);
  return <TripsList dbData={data} />;
}
