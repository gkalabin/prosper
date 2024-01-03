import {NordigenRequisition, NordigenToken} from '@prisma/client';
import {AccountDetails} from 'lib/openbanking/interface';

export async function fetchAccounts(
  token: NordigenToken,
  requisition: NordigenRequisition
): Promise<AccountDetails[]> {
  if (!requisition) {
    console.warn('No requisition provided', requisition);
    return [];
  }
  const response = await fetch(
    `https://ob.nordigen.com/api/v2/requisitions/${requisition.requisitionId}/`,
    {
      method: 'GET',
      headers: {Authorization: `Bearer ${token.access}`},
    }
  ).then(r => r.json());
  if (!response?.accounts?.length) {
    console.warn('No accounts found for requisition', requisition, response);
    return [];
  }
  // TODO: define the interface for the external API response.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetches = response.accounts.map((aid: any) =>
    fetch(`https://ob.nordigen.com/api/v2/accounts/${aid}/details/`, {
      method: 'GET',
      headers: {Authorization: `Bearer ${token.access}`},
    })
      .then(response => response.json())
      .then(a => {
        return {
          externalAccountId: aid,
          name: `${a.account.ownerName} (${a.account.currency} ${a.account.iban})`,
        };
      })
  );

  return await Promise.all(fetches);
}
