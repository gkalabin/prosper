import {AccountBalance} from '@/lib/openbanking/interface';
import {parseExternalAccountId} from '@/lib/openbanking/starling/account';
import {StarlingBalanceResponse} from '@/lib/openbanking/starling/types';
import {ExternalAccountMapping, StarlingToken} from '@prisma/client';

export async function fetchBalance(
  token: StarlingToken,
  mapping: ExternalAccountMapping
): Promise<AccountBalance> {
  const {accountUid} = parseExternalAccountId(mapping.externalAccountId);
  return await fetch(
    `https://api.starlingbank.com/api/v2/accounts/${accountUid}/balance`,
    {
      method: 'GET',
      headers: {Authorization: `Bearer ${token.access}`},
    }
  )
    .then(r => r.json())
    .then((r: StarlingBalanceResponse) => {
      if (r?.effectiveBalance) {
        return {
          balanceCents: Math.round(r.effectiveBalance.minorUnits),
          internalAccountId: mapping.internalAccountId,
        };
      }
      console.warn(
        'No balance found for Starling bank',
        JSON.stringify(r, null, 2)
      );
      throw new Error(`No balance found for ${mapping.externalAccountId}`);
    });
}
