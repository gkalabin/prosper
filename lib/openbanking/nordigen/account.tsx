import { NordigenRequisition, NordigenToken } from "@prisma/client";
import { AccountDetails } from "lib/openbanking/interface";

export async function fetchAccounts(
  token: NordigenToken,
  requisition: NordigenRequisition
): Promise<AccountDetails[]> {
  const response = await fetch(
    `https://ob.nordigen.com/api/v2/requisitions/${requisition.requisitionId}/`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token.access}` },
    }
  ).then((r) => r.json());
  if (!response?.accounts?.length) {
    console.warn("No accounts found for requisition", requisition, response);
    return [];
  }
  const fetches = response.accounts.map((aid) =>
    fetch(`https://ob.nordigen.com/api/v2/accounts/${aid}/details/`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token.access}` },
    })
      .then((response) => response.json())
      .then((a) => {
        return {
          externalAccountId: aid,
          name: `${a.account.ownerName} (${a.account.currency} ${a.account.iban})`,
        };
      })
  );

  return await Promise.all(fetches);
}
