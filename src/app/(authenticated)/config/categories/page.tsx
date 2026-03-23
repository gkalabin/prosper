import {CategoriesConfigPage} from '@/app/(authenticated)/config/categories/client';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {cachedCoreDataOrFetch} from '@/lib/db/cache';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Categories Config - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const core = await cachedCoreDataOrFetch(auth);
  return <CategoriesConfigPage dbCategories={core.categories} />;
}
