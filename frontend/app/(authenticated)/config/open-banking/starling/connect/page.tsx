import {ConnectForm} from '@/app/(authenticated)/config/open-banking/starling/connect/ConnectForm';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {fetchCoreData} from '@/lib/db/fetch';
import {firstPositiveIntOrNull} from '@/lib/util/searchParams';
import {Metadata} from 'next';
import {notFound} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Starling Connect - Prosper',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{[key: string]: string | string[] | undefined}>;
}) {
  const bankId = firstPositiveIntOrNull((await searchParams)['bankId']);
  if (!bankId) {
    return notFound();
  }
  const auth = await getAuthContextOrRedirect();
  const core = await fetchCoreData(auth);
  const bank = core.banks.find(b => b.id === bankId);
  if (!bank) {
    return notFound();
  }
  return <ConnectForm bank={bank} />;
}
