import {DisplaySettingsPage} from '@/app/(authenticated)/config/display-settings/client';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Display Settings - Prosper',
};

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  const db = new DB({userId});
  const dbDisplaySettings = await db.getOrCreateDbDisplaySettings();
  const dbCategories = await db.categoryFindMany();
  return (
    <>
      <h1 className="mb-6 text-2xl leading-7">Display settings</h1>
      <DisplaySettingsPage
        dbDisplaySettings={dbDisplaySettings}
        dbCategories={dbCategories}
      />
    </>
  );
}
