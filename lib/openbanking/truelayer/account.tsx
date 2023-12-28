import { TrueLayerToken } from "@prisma/client";
import { AccountDetails } from "lib/openbanking/interface";

export function fetchAccounts(
  token: TrueLayerToken
): Promise<AccountDetails[]> {
  return fetch(`https://api.truelayer.com/data/v1/accounts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  })
    .then((r) => r.json())
    .then((x) => {
      return x.results.map((r) => {
        const { account_id, display_name, currency, provider } = r;
        return {
          internalAccountId: account_id,
          name: `${display_name} ${
            provider?.display_name ?? ""
          } (${currency}))`,
        };
      });
    });
}
