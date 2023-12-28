import { ExternalAccountMapping, OpenBankingToken } from "@prisma/client";
import { WithdrawalOrDepositPrototype } from "lib/txsuggestions/TransactionPrototype";

export function fetchTransactions(
  token: OpenBankingToken,
  mapping: ExternalAccountMapping
): Promise<WithdrawalOrDepositPrototype[]> {
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

function decode(arg: {
  accountId: number;
  r: { results: TrueLayerTransaction[] };
}): WithdrawalOrDepositPrototype[] {
  const { results } = arg.r;
  if (results?.length === 0) {
    return [];
  }
  if (!results?.length) {
    console.warn("True layer transactions error", arg.r);
    return [];
  }
  results.forEach(logIfExtraFields);
  return results.map((t) => {
    const proto = {
      type: t.amount > 0 ? ("deposit" as const) : ("withdrawal" as const),
      timestampEpoch: new Date(t.timestamp).getTime(),
      description: t.description,
      originalDescription: t.description,
      externalTransactionId: t.transaction_id,
      absoluteAmountCents: Math.abs(Math.round(t.amount * 100)),
      internalAccountId: arg.accountId,
    };
    // Reverse engineered attempt to keep the same transaction id before and after transaction settled.
    if (t.provider_transaction_id) {
      proto.externalTransactionId = t.provider_transaction_id;
    }
    // Starling reports the actual transaction time in a meta field.
    // Prefer it over the time when the transaction was settled.
    if (t.meta.transaction_time) {
      proto.timestampEpoch = new Date(t.meta.transaction_time).getTime();
    }
    return proto;
  });
}

// OBTransaction represents an open banking transaction from True Layer API.
interface TrueLayerTransaction {
  meta: {
    provider_category: string;
    transaction_type: string;
    provider_id: string;
    provider_merchant_name: string;
    counter_party_preferred_name: string;
    user_comments: string;
    transaction_time: string;
    provider_reference: string;
  };
  amount: number;
  currency: string;
  description: string;
  transaction_id: string;
  provider_transaction_id: string;
  normalised_provider_transaction_id: string;
  merchant_name: string;
  running_balance: { currency: string; amount: number };
  timestamp: string;
  transaction_type: string;
  transaction_category: string;
  transaction_classification: Array<string>;
}

function logIfExtraFields(t: TrueLayerTransaction) {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  {
    const {
      meta,
      amount,
      currency,
      description,
      transaction_id,
      provider_transaction_id,
      normalised_provider_transaction_id,
      merchant_name,
      running_balance,
      timestamp,
      transaction_type,
      transaction_category,
      transaction_classification,
      ...rest
    } = t;
    if (Object.keys(rest).length) {
      console.warn(
        "True Layer transaction has extra fields",
        JSON.stringify(rest, null, 2)
      );
    }
  }
  {
    const {
      provider_category,
      transaction_type,
      provider_id,
      provider_merchant_name,
      counter_party_preferred_name,
      user_comments,
      transaction_time,
      provider_reference,
      ...rest
    } = t.meta;
    if (Object.keys(rest).length) {
      console.warn(
        "True Layer transaction meta has extra fields",
        JSON.stringify(rest, null, 2)
      );
    }
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
