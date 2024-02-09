import {StarlingToken} from '@prisma/client';
import {AccountDetails} from '@/lib/openbanking/interface';

const categorySeparator = '@';

export async function fetchAccounts(
  token: StarlingToken
): Promise<AccountDetails[]> {
  const response = await fetch(`https://api.starlingbank.com/api/v2/accounts`, {
    method: 'GET',
    headers: {Authorization: `Bearer ${token.access}`},
  }).then(r => r.json());
  return (response.accounts ?? []).map(
    // TODO: define the interface for the external API response.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({accountUid, defaultCategory, name, currency}: any) =>
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
