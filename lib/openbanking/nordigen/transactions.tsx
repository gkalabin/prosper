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
  return [...(booked ?? []), ...(pending ?? [])].map((t) => {
    const {
      transactionAmount,
      transactionId,
      internalTransactionId,
      valueDateTime,
      creditorName,
      remittanceInformationUnstructuredArray
    } = t;
    const amountCents = Math.round(transactionAmount.amount * 100);
    const proto = {
      type: amountCents > 0 ? ("deposit" as const) : ("withdrawal" as const),
      timestampEpoch: new Date(valueDateTime).getTime(),
      description: creditorName,
      originalDescription: creditorName,
      externalTransactionId: transactionId ?? internalTransactionId,
      absoluteAmountCents: Math.abs(amountCents),
      internalAccountId: arg.accountId,
    };
    if (!proto.description) {
      proto.description = remittanceInformationUnstructuredArray?.[0] ?? "";
    }
    return proto;
  });
}
