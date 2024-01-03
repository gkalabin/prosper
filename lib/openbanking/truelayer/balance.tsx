import {ExternalAccountMapping, TrueLayerToken} from '@prisma/client';
import {AccountBalance} from 'lib/openbanking/interface';

export async function fetchBalance(
  token: TrueLayerToken,
  mapping: ExternalAccountMapping
): Promise<AccountBalance> {
  const init = {
    method: 'GET',
    headers: {Authorization: `Bearer ${token.access}`},
  };
  const url = `https://api.truelayer.com/data/v1/accounts/${mapping.externalAccountId}/balance`;
  const r = await fetch(url, init);
  const x = await r.json();
  if (!x.results?.length) {
    console.warn('No balance found', x);
    throw new Error(`No balance found for ${mapping.externalAccountId}`);
  }
  // fields are: available, current, overdraft
  //   current - for some banks includes non settled amount
  //   current - includes overdraft
  //   overdraft - how much you can lend from the bank, can be missing
  const [{available, overdraft}] = x.results;
  const balanceDollars = available - (overdraft ?? 0);
  return {
    balanceCents: Math.round(balanceDollars * 100),
    internalAccountId: mapping.internalAccountId,
  };
}
