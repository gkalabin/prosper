import {OpenBankingMappingConfigPage} from '@/app/(authenticated)/config/open-banking/mapping/client';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {fetchCoreData} from '@/lib/db/fetch';
import {openBankingClient} from '@/lib/grpc/client';
import {firstPositiveIntOrNull} from '@/lib/util/searchParams';
import {Metadata} from 'next';
import {notFound} from 'next/navigation';

export const metadata: Metadata = {
  title: 'Open Banking Mapping - Prosper',
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
  const accountsForBank = core.bankAccounts.filter(a => a.bankId === bankId);
  const [{response: external}, {response: mapping}] = await Promise.all([
    openBankingClient.listExternalAccounts(withAuth({bankId}, auth)),
    openBankingClient.listMappings(withAuth({bankId}, auth)),
  ]);
  if (!external.accounts.length) {
    return (
      <div>Bank {bank.name} is not connected to any open banking accounts.</div>
    );
  }
  return (
    <OpenBankingMappingConfigPage
      bank={bank}
      bankAccounts={accountsForBank}
      stocks={core.stocks}
      mappings={mapping.mappings}
      externalAccounts={external.accounts}
    />
  );
}
