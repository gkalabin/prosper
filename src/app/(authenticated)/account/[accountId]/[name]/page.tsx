import {AccountPage} from '@/app/(authenticated)/account/[accountId]/[name]/account-page';
import {getUserIdOrRedirect} from '@/lib/auth/user';
import {DB, fetchAllDatabaseData} from '@/lib/db';
import {logRequest} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {AccountNEW} from '@prisma/client';
import {Metadata} from 'next';
import {notFound} from 'next/navigation';

type Props = {params: {accountId: string}};

async function fetchAccount(props: Props): Promise<AccountNEW | null> {
  const userId = await getUserIdOrRedirect();
  const accountId = positiveIntOrNull(props.params.accountId);
  if (!accountId) {
    return null;
  }
  const db = new DB({userId});
  const [account] = await db.accountFindMany({where: {id: accountId}});
  return account ? account : null;
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const account = await fetchAccount({params});
  if (!account) {
    return notFound();
  }
  return {
    title: account.name + ' - Prosper',
  };
}

// 'name' parameter is unused intentionally, it is used only to make the URLs look
// nice, but the actual bank is identified by a separate id parameter.
export default async function Page({params}: Props) {
  const userId = await getUserIdOrRedirect();
  const account = await fetchAccount({params});
  if (!account) {
    return notFound();
  }
  logRequest('account', `userId:${userId} accountId:${account.id}`);
  const db = new DB({userId});
  const data = await fetchAllDatabaseData(db);
  return <AccountPage dbData={data} dbAccount={account} />;
}
