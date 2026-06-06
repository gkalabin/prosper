import {AccountPage} from '@/app/(authenticated)/account/[accountId]/[name]/account-page';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {fetchCoreData} from '@/lib/db/fetch';
import {BankAccount as ProtoBankAccount} from '@/lib/grpc/gen/prosper/v1/ledger';
import {logRequest} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {Metadata} from 'next';
import {notFound} from 'next/navigation';

type Props = {params: Promise<{accountId: string}>};

async function fetchAccount(props: Props): Promise<ProtoBankAccount | null> {
  const auth = await getAuthContextOrRedirect();
  const accountId = positiveIntOrNull((await props.params).accountId);
  if (!accountId) {
    return null;
  }
  const core = await fetchCoreData(auth);
  return core.bankAccounts.find(a => a.id === accountId) ?? null;
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
  const auth = await getAuthContextOrRedirect();
  const account = await fetchAccount({params});
  if (!account) {
    return notFound();
  }
  logRequest('account', `userId:${auth.userId} accountId:${account.id}`);
  const data = await fetchAppData(auth);
  return <AccountPage dbData={data} dbAccount={account} />;
}
