import {BankPage} from '@/app/(authenticated)/bank/[bankId]/[name]/bank-page';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchAppData} from '@/lib/db';
import {cachedCoreDataOrFetch} from '@/lib/db/cache';
import {Bank as ProtoBank} from '@/lib/grpc/gen/prosper/v1/ledger';
import {logRequest} from '@/lib/util/log';
import {positiveIntOrNull} from '@/lib/util/searchParams';
import {Metadata} from 'next';
import {notFound} from 'next/navigation';

type Props = {params: Promise<{bankId: string}>};

async function fetchBank(props: Props): Promise<ProtoBank | null> {
  const auth = await getAuthContextOrRedirect();
  const bankId = positiveIntOrNull((await props.params).bankId);
  if (!bankId) {
    return null;
  }
  const core = await cachedCoreDataOrFetch(auth);
  return core.banks.find(b => b.id === bankId) ?? null;
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const bank = await fetchBank({params});
  if (!bank) {
    return notFound();
  }
  return {
    title: bank.name + ' - Prosper',
  };
}

// 'name' parameter is unused intentionally, it is used only to make the URLs look
// nice, but the actual bank is identified by a separate id parameter.
export default async function Page({params}: Props) {
  const auth = await getAuthContextOrRedirect();
  const bank = await fetchBank({params});
  if (!bank) {
    return notFound();
  }
  logRequest('bank', `userId:${auth.userId} bankId:${bank.id}`);
  const data = await fetchAppData(auth);
  return <BankPage dbData={data} dbBank={bank} />;
}
