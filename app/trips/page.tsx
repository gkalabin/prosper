import {TripsList} from 'app/trips/TripsList';
import {DB, fetchAllDatabaseData} from 'lib/db';
import {getUserId} from 'lib/user';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Trips - Prosper',
};

export default async function Page() {
  const userId = await getUserId();
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <TripsList dbData={data} />;
}
