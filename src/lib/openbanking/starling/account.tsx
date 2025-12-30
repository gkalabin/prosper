import {AccountDetails} from '@/lib/openbanking/interface';
import {
  StarlingAccount,
  StarlingAccountsResponse,
} from '@/lib/openbanking/starling/types';
import {StarlingToken} from '@prisma/client';

const categorySeparator = '@';

export async function fetchAccounts(
  token: StarlingToken
): Promise<AccountDetails[]> {
  const response: StarlingAccountsResponse = await fetch(
    `https://api.starlingbank.com/api/v2/accounts`,
    {
      method: 'GET',
      headers: {Authorization: `Bearer ${token.access}`},
    }
  ).then(r => r.json());
  return (response.accounts ?? []).map(
    ({accountUid, defaultCategory, name, currency}: StarlingAccount) =>
      ({
        externalAccountId: `${accountUid}${categorySeparator}${defaultCategory}`,
        name: `${name} (${currency})`,
      }) as AccountDetails
  );
}

export const parseExternalAccountId = (externalAccountId: string) => {
  const [accountUid, defaultCategory] =
    externalAccountId.split(categorySeparator);
  return {accountUid, defaultCategory};
};
