import {AccountDetails} from '@/lib/openbanking/interface';
import {StarlingToken} from '@prisma/client';
import {z} from 'zod';

const categorySeparator = '@';

const StarlingAccountSchema = z.object({
  accountUid: z.string(),
  defaultCategory: z.string(),
  name: z.string(),
  currency: z.string(),
});

const StarlingAccountsResponseSchema = z.object({
  accounts: z.array(StarlingAccountSchema).optional(),
});

type StarlingAccount = z.infer<typeof StarlingAccountSchema>;

export async function fetchAccounts(
  token: StarlingToken
): Promise<AccountDetails[]> {
  const response = await fetch(`https://api.starlingbank.com/api/v2/accounts`, {
    method: 'GET',
    headers: {Authorization: `Bearer ${token.access}`},
  })
    .then(r => r.json())
    .then(r => StarlingAccountsResponseSchema.parse(r));

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
