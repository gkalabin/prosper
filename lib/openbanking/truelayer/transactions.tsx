import { ExternalAccountMapping, TrueLayerToken } from "@prisma/client";
import { Transaction } from "lib/openbanking/interface";

export function fetchTransactions(
  token: TrueLayerToken,
  mapping: ExternalAccountMapping
): Promise<Transaction[]> {
  const init = {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  };
  const urlSettled = `https://api.truelayer.com/data/v1/accounts/${mapping.externalAccountId}/transactions`;
  const urlPending = `https://api.truelayer.com/data/v1/accounts/${mapping.externalAccountId}/transactions/pending`;
  const fetches = [urlSettled, urlPending].map((url) =>
    fetch(url, init)
      .then((r) => r.json())
      .then((r) => decode({ r, accountId: mapping.internalAccountId }))
  );
  return Promise.all(fetches).then((x) => x.flat());
}

function decode(arg: { accountId: number; r }): Transaction[] {
  const { results } = arg.r;
  if (results?.length === 0) {
    return [];
  }
  if (!results?.length) {
    console.warn("True layer transactions error", arg.r);
    return [];
  }
  return results.map((t): Transaction => {
    return {
      // Starling reports the actual transaction time in a meta field.
      // Prefer it over the time when the transaction was settled.
      timestamp: new Date(t.meta.transaction_time ?? t.timestamp),
      description: t.description,
      // Reverse engineered attempt to keep the same transaction id before and after transaction settled.
      externalTransactionId: t.provider_transaction_id ?? t.transaction_id,
      amountCents: Math.round(t.amount * 100),
      internalAccountId: arg.accountId,
    };
  });
}
