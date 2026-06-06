import {DisplaySettingsPage} from '@/app/(authenticated)/config/display-settings/client';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchCoreData} from '@/lib/db/fetch';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Display Settings - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const core = await fetchCoreData(auth);
  return (
    <>
      <h1 className="mb-6 text-2xl leading-7">Display settings</h1>
      <DisplaySettingsPage
        dbDisplaySettings={core.displaySettings}
        dbCategories={core.categories}
      />
    </>
  );
}
