import { OpenBankingAccount, OpenBankingToken } from "@prisma/client";
import { DB } from "lib/db";
import { IOBTransaction } from "lib/openbanking/interface";
import { maybeRefreshToken } from "lib/openbanking/token";
import { WithdrawalOrDepositPrototype } from "lib/txsuggestions/TransactionSuggestion";

const obSettledTxURL = (accountId: string) =>
  `https://api.truelayer.com/data/v1/accounts/${accountId}/transactions`;
const obPendingTxURL = (accountId: string) =>
  `https://api.truelayer.com/data/v1/accounts/${accountId}/transactions/pending`;

export async function fetchOpenBankingTransactions(
  db: DB
): Promise<WithdrawalOrDepositPrototype[]> {
  const banks = await db.bankFindMany();
  const bankAccounts = await db.bankAccountFindMany({
    where: {
      bankId: {
        in: banks.map((x) => x.id),
      },
    },
  });
  const dbOpenBankingAccounts = await db.openBankingAccountFindMany({
    where: {
      bankAccountId: {
        in: bankAccounts.map((x) => x.id),
      },
    },
  });

  const dbTokens = await db.openBankingTokenFindMany({
    where: {
      bankId: {
        in: banks.map((x) => x.id),
      },
    },
  });

  const accountsByToken: { [tokenId: string]: OpenBankingAccount[] } =
    Object.fromEntries(
      dbTokens.map((t) => {
        const dbAccounts = bankAccounts.filter((x) => x.bankId == t.bankId);
        const ids = Object.fromEntries(dbAccounts.map((x) => [x.id, 1]));
        return [
          t.id,
          dbOpenBankingAccounts.filter((x) => !!ids[x.bankAccountId]),
        ];
      })
    );

  const obDataParts = await Promise.all(
    dbTokens.map((x) =>
      fetchTransactionsForSingleBank(x, accountsByToken[x.id] ?? []).catch(
        (err) => {
          console.error(
            `Error fetching transactions for bank ${x.bankId}:`,
            err
          );
          return [] as WithdrawalOrDepositPrototype[];
        }
      )
    )
  );
  return obDataParts.flat();
}

async function fetchTransactionsForSingleBank(
  tokenIn: OpenBankingToken,
  accounts: OpenBankingAccount[]
): Promise<WithdrawalOrDepositPrototype[]> {
  if (!accounts.length) {
    return [];
  }
  const token = await maybeRefreshToken(tokenIn);
  const init = {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  };
  const fetches = [] as Promise<WithdrawalOrDepositPrototype[]>[];
  for (const account of accounts) {
    const accountId = account.bankAccountId;
    fetches.push(
      fetch(obSettledTxURL(account.openBankingAccountId), init)
        .then((r) => r.json())
        .then((x) => postProcess({ response: x, accountId })),
      fetch(obPendingTxURL(account.openBankingAccountId), init)
        .then((r) => r.json())
        .then((x) => postProcess({ response: x, accountId }))
    );
  }
  return Promise.all(fetches).then((x) => x.flat());
}

function postProcess(arg: {
  accountId: number;
  response: { results: IOBTransaction[] };
}): WithdrawalOrDepositPrototype[] {
  const { results } = arg.response;
  if (results?.length === 0) {
    return [];
  }
  if (!results?.length) {
    console.warn("True layer transactions error", arg.response);
    return [];
  }
  results.forEach(logIfExtraFields);
  return results.map((t: IOBTransaction) => {
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

function logIfExtraFields(t: IOBTransaction) {
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
      running_balance,
      timestamp,
      transaction_type,
      transaction_category,
      transaction_classification,
      merchant_name,
      settled,
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
