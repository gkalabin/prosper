import {BanksConfigPage} from '@/app/(authenticated)/config/banks/BanksConfigPage';
import {getAuthContextOrRedirect} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {cachedCoreDataOrFetch} from '@/lib/db/cache';
import {openBankingClient} from '@/lib/grpc/client';
import {Provider} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Banks Config - Prosper',
};

export default async function Page() {
  const auth = await getAuthContextOrRedirect();
  const [core, {response: status}] = await Promise.all([
    cachedCoreDataOrFetch(auth),
    openBankingClient.getConnectionStatus(withAuth({}, auth)),
  ]);
  const trueLayerBanks = status.expirations
    .filter(e => e.provider === Provider.TRUELAYER)
    .map(e => e.bankId);
  const gocardlessBanks = status.expirations
    .filter(e => e.provider === Provider.GOCARDLESS)
    .map(e => e.bankId);
  const starlingBanks = status.expirations
    .filter(e => e.provider === Provider.STARLING)
    .map(e => e.bankId);
  return (
    <BanksConfigPage
      banks={core.banks}
      bankAccounts={core.bankAccounts}
      stocks={core.stocks}
      trueLayerBankIds={trueLayerBanks}
      gocardlessBankIds={gocardlessBanks}
      starlingBankIds={starlingBanks}
      displaySettings={core.displaySettings}
    />
  );
}
