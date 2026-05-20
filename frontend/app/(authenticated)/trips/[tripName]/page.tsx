import {TripDetails} from '@/app/(authenticated)/trips/[tripName]/TripDetails';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {Metadata} from 'next';
import {redirect} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Trips - Prosper',
};

export default async function Page({
  params,
}: {
  params: Promise<{tripName: string}>;
}) {
  const auth = await getAuthContextOrRedirect();
  const data = await fetchAppData(auth);
  const tripName = (await params).tripName;
  const dbTrip = data.trips.find(t => t.name == tripName);
  if (!dbTrip) {
    return redirect('/trips');
  }
  return <TripDetails dbData={data} dbTrip={dbTrip} />;
}
