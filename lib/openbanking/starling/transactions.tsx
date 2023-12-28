import { ExternalAccountMapping, StarlingToken } from "@prisma/client";
import { WithdrawalOrDepositPrototype } from "lib/txsuggestions/TransactionPrototype";
import { parseExternalAccountId } from "lib/openbanking/starling/account";
import { addMinutes, subDays, subMonths } from "date-fns";

export async function fetchTransactions(
  token: StarlingToken,
  mapping: ExternalAccountMapping
): Promise<WithdrawalOrDepositPrototype[]> {
  const init = {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}` },
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

function decode(arg: {
  accountId: number;
  response;
}): WithdrawalOrDepositPrototype[] {
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
    const proto = {
      type: direction == "OUT" ? ("withdrawal" as const) : ("deposit" as const),
      timestampEpoch: new Date(transactionTime).getTime(),
      description: counterPartyName,
      originalDescription: counterPartyName,
      externalTransactionId: feedItemUid,
      absoluteAmountCents: Math.abs(amountCents),
      internalAccountId: arg.accountId,
    };
    return proto;
  });
}
