import {CategoriesConfigPage} from '@/app/(authenticated)/config/categories/client';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Categories Config - Prosper',
};

export default async function Page() {
  const userId = await getUserIdOrRedirect();
  const db = new DB({userId});
  const dbCategories = await db.categoryFindMany();
  return <CategoriesConfigPage dbCategories={dbCategories} />;
}
