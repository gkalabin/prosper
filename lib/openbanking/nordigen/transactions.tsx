import { ExternalAccountMapping, NordigenToken } from "@prisma/client";
import { WithdrawalOrDepositPrototype } from "lib/txsuggestions/TransactionPrototype";

export function fetchTransactions(
  token: NordigenToken,
  mapping: ExternalAccountMapping
): Promise<WithdrawalOrDepositPrototype[]> {
  const init = {
    method: "GET",
    headers: { Authorization: `Bearer ${token.access}` },
  };
  const url = `https://ob.nordigen.com/api/v2/accounts/${mapping.externalAccountId}/transactions/`;
  return fetch(url, init)
    .then((r) => r.json())
    .then((x) => decode({ response: x, accountId: mapping.internalAccountId }));
}

function decode(arg: {
  accountId: number;
  response;
}): WithdrawalOrDepositPrototype[] {
  const { transactions } = arg.response;
  if (!transactions) {
    console.warn("Nordigen transactions error", arg.response);
    return [];
  }
  const { booked, pending } = transactions;
  if (!booked?.length && !pending?.length) {
    console.warn("Nordigen transactions error", arg.response);
    return [];
  }
  const all = [...(booked ?? []), ...(pending ?? [])];
  return all.map((t) => {
    const amountCents = Math.round(t.transactionAmount.amount * 100);
    const proto = {
      type: amountCents > 0 ? ("deposit" as const) : ("withdrawal" as const),
      timestampEpoch: new Date(t.valueDateTime).getTime(),
      description: t.creditorName,
      originalDescription: t.creditorName,
      externalTransactionId: t.transactionId,
      absoluteAmountCents: Math.abs(amountCents),
      internalAccountId: arg.accountId,
    };
    return proto;
  });
  return [];
}
