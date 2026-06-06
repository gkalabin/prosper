import {CategoriesConfigPage} from '@/app/(authenticated)/config/categories/client';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchCoreData} from '@/lib/db/fetch';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Categories Config - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const core = await fetchCoreData(auth);
  return <CategoriesConfigPage dbCategories={core.categories} />;
}
