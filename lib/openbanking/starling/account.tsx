import { StarlingToken } from "@prisma/client";
import { AccountDetails } from "lib/openbanking/interface";

const categorySeparator = "@";

export async function fetchAccounts(
  token: StarlingToken
): Promise<AccountDetails[]> {
  const response = await fetch(`https://api.starlingbank.com/api/v2/accounts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  }).then((r) => r.json());
  return response.accounts?.map(
    (account: any) =>
      ({
        externalAccountId: `${account.accountUid}${categorySeparator}${account.defaultCategory}`,
        name: `${account.name} (${account.currency})`,
      } as AccountDetails)
  );
}

export const parseExternalAccountId = (externalAccountId: string) => {
  const [accountUid, defaultCategory] = externalAccountId.split(categorySeparator);
  return { accountUid, defaultCategory };
}
