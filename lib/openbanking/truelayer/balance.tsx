import { ExternalAccountMapping, TrueLayerToken } from "@prisma/client";
import { AccountBalance } from "lib/openbanking/interface";

export function fetchBalance(
  token: TrueLayerToken,
  mapping: ExternalAccountMapping
): Promise<AccountBalance> {
  const init = {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  };
  const url = `https://api.truelayer.com/data/v1/accounts/${mapping.externalAccountId}/balance`;
  return fetch(url, init)
    .then((r) => r.json())
    .then((x) => {
      if (!x.results?.length) {
        console.warn("No balance found", x);
        return;
      }
      // fields are: available, current, overdraft
      //   current - for some banks includes non settled amount
      //   current - includes overdraft
      //   overdraft - how much you can lend from the bank, can be missing
      const [{ available, overdraft }] = x.results;
      const balanceDollars = available - (overdraft ?? 0);
      return {
        balanceCents: Math.round(balanceDollars * 100),
        internalAccountId: mapping.internalAccountId,
      };
    });
}
