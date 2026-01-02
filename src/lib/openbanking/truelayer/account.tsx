import {AccountDetails} from '@/lib/openbanking/interface';
import {TrueLayerToken} from '@prisma/client';

export async function fetchAccounts(
  token: TrueLayerToken
): Promise<AccountDetails[]> {
  return await fetch(`https://api.truelayer.com/data/v1/accounts`, {
    method: 'GET',
    headers: {Authorization: `Bearer ${token.access}`},
  })
    .then(r => r.json())
    .then(x => {
      // TODO: define the interface for the external API response.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return x.results?.map((r: any) => {
        const {account_id, display_name, currency, provider} = r;
        return {
          externalAccountId: account_id,
          name: `${display_name} ${provider?.display_name ?? ''} (${currency})`,
        } as AccountDetails;
      });
    });
}
