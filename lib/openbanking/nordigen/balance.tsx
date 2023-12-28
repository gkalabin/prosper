import { ExternalAccountMapping, NordigenToken } from "@prisma/client";
import { AccountBalance } from "lib/openbanking/interface";

export function fetchBalance(
  token: NordigenToken,
  mapping: ExternalAccountMapping
): Promise<AccountBalance> {
  return fetch(
    `https://ob.nordigen.com/api/v2/accounts/${mapping.externalAccountId}/balances/`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token.access}` },
    }
  )
    .then((r) => r.json())
    .then((r) => {
      if (!r.balances?.length) {
        console.warn("No balance found", JSON.stringify(r, null, 2));
        return;
      }
      for (const { balanceType, balanceAmount } of r.balances) {
        if (balanceType === "interimAvailable" || balanceType === "expected") {
          return {
            balanceCents: Math.round(balanceAmount.amount * 100),
            internalAccountId: mapping.internalAccountId,
          };
        }
      }
      console.warn("No balance found", JSON.stringify(r, null, 2));
      return;
    });
}
