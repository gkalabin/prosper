import {ExternalAccountMapping, NordigenToken} from '@prisma/client';
import {AccountBalance} from 'lib/openbanking/interface';

export async function fetchBalance(
  token: NordigenToken,
  mapping: ExternalAccountMapping
): Promise<AccountBalance> {
  const response = await fetch(
    `https://ob.nordigen.com/api/v2/accounts/${mapping.externalAccountId}/balances/`,
    {
      method: 'GET',
      headers: {Authorization: `Bearer ${token.access}`},
    }
  );
  if (response.status !== 200) {
    throw new Error(
      `Refresh token for ${token.bankId} failed (code ${
        response.status
      }): ${await response.text()}`
    );
  }
  const r = await response.json();
  const balances = r.balances ?? [];
  for (const {balanceType, balanceAmount} of balances) {
    if (balanceType === 'interimAvailable' || balanceType === 'expected') {
      return {
        balanceCents: Math.round(balanceAmount.amount * 100),
        internalAccountId: mapping.internalAccountId,
      };
    }
  }
  throw new Error(`no balance found: ${JSON.stringify(r, null, 2)}`);
}
