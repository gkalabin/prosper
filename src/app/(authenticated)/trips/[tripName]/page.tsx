import {TripDetails} from '@/app/(authenticated)/trips/[tripName]/TripDetails';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, fetchAllDatabaseData} from '@/lib/db';
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
  const userId = await getUserIdOrRedirect();
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  const tripName = (await params).tripName;
  const dbTrip = data.dbTrips.find(t => t.name == tripName);
  if (!dbTrip) {
    return redirect('/trips');
  }
  return <TripDetails dbData={data} dbTrip={dbTrip} />;
}
