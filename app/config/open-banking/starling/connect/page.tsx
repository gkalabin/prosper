import {ConnectForm} from 'app/config/open-banking/starling/connect/ConnectForm';
import {DB} from 'lib/db';
import {getUserId} from 'lib/user';
import {firstPositiveIntOrNull} from 'lib/util/searchParams';
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
  searchParams: {[key: string]: string | string[] | undefined};
}) {
  const bankId = firstPositiveIntOrNull(searchParams['bankId']);
  if (!bankId) {
    return notFound();
  }
  const userId = await getUserId();
  const {dbBank} = await getData(userId, bankId);
  return <ConnectForm dbBank={dbBank} />;
}
