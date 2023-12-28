import { ExternalAccountMapping, StarlingToken } from "@prisma/client";
import { addMinutes, subMonths } from "date-fns";
import { Transaction } from "lib/openbanking/interface";
import { parseExternalAccountId } from "lib/openbanking/starling/account";

export async function fetchTransactions(
  token: StarlingToken,
  mapping: ExternalAccountMapping
): Promise<Transaction[]> {
  const init = {
    method: "GET",
    headers: { Authorization: `Bearer ${token.access}` },
  };
  const { accountUid, defaultCategory } = parseExternalAccountId(
    mapping.externalAccountId
  );
  const now = new Date();
  const minTs = subMonths(now, 3);
  const maxTs = addMinutes(now, 5);
  const url = `https://api.starlingbank.com/api/v2/feed/account/${accountUid}/category/${defaultCategory}/transactions-between?minTransactionTimestamp=${minTs.toISOString()}&maxTransactionTimestamp=${maxTs.toISOString()}`;
  return await fetch(url, init)
    .then((r) => r.json())
    .then((x) => decode({ response: x, accountId: mapping.internalAccountId }));
}

function decode(arg: { accountId: number; response }): Transaction[] {
  const { feedItems } = arg.response;
  if (feedItems?.length === 0) {
    return [];
  }
  if (!feedItems?.length) {
    console.warn("Starling transactions error", arg.response);
    return [];
  }
  return feedItems.map((t) => {
    const {
      amount,
      direction,
      feedItemUid,
      transactionTime,
      counterPartyName,
    } = t;
    const amountCents = Math.round(amount.minorUnits);
    return {
      timestamp: new Date(transactionTime),
      description: counterPartyName,
      externalTransactionId: feedItemUid,
      amountCents: amountCents * (direction == "OUT" ? -1 : 1),
      internalAccountId: arg.accountId,
    };
  });
}
