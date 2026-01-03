import {ConnectForm} from '@/app/(authenticated)/config/open-banking/starling/connect/ConnectForm';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB} from '@/lib/db';
import {firstPositiveIntOrNull} from '@/lib/util/searchParams';
import {Metadata} from 'next';
import {notFound} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Starling Connect - Prosper',
};

async function getData(userId: number, bankId: number) {
  const db = new DB({userId});
  const [dbBank] = await db.bankFindMany({
    where: {
      id: bankId,
    },
  });
  if (!dbBank) {
    return notFound();
  }
  return {dbBank};
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{[key: string]: string | string[] | undefined}>;
}) {
  const bankId = firstPositiveIntOrNull((await searchParams)['bankId']);
  if (!bankId) {
    return notFound();
  }
  const userId = await getUserIdOrRedirect();
  const {dbBank} = await getData(userId, bankId);
  return <ConnectForm dbBank={dbBank} />;
}
