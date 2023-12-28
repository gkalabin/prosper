import { TrueLayerToken } from "@prisma/client";
import { AccountDetails } from "lib/openbanking/interface";

export async function fetchAccounts(
  token: TrueLayerToken
): Promise<AccountDetails[]> {
  return await fetch(`https://api.truelayer.com/data/v1/accounts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token.access}` },
  })
    .then((r) => r.json())
    .then((x) => {
      return x.results?.map((r) => {
        const { account_id, display_name, currency, provider } = r;
        return {
          externalAccountId: account_id,
          name: `${display_name} ${
            provider?.display_name ?? ""
          } (${currency})`,
        } as AccountDetails;
      });
    });
}
