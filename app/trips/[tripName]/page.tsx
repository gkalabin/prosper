import {TripDetails} from 'app/trips/[tripName]/TripDetails';
import {DB, fetchAllDatabaseData} from 'lib/db';
import {getUserId} from 'lib/user';
import {Metadata} from 'next';
import {redirect} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Trips - Prosper',
};

export default async function Page({params}: {params: {tripName: string}}) {
  const userId = await getUserId();
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  const tripName = params.tripName;
  const dbTrip = data.dbTrips.find(t => t.name == tripName);
  if (!dbTrip) {
    return redirect('/trips');
  }
  return <TripDetails dbData={data} dbTrip={dbTrip} />;
}
