import { OpenBankingAccount, OpenBankingToken } from "@prisma/client";
import {
  IOBTransaction,
  IOBTransactionsByAccountId,
} from "lib/openbanking/interface";
import { maybeRefreshToken } from "lib/openbanking/token";
import prisma from "lib/prisma";

const obSettledTxURL = (accountId: string) =>
  `https://api.truelayer.com/data/v1/accounts/${accountId}/transactions`;
const obPendingTxURL = (accountId: string) =>
  `https://api.truelayer.com/data/v1/accounts/${accountId}/transactions/pending`;

export async function fetchOpenBankingTransactions({
  userId,
}: {
  userId: number;
}): Promise<IOBTransactionsByAccountId> {
  const banks = await prisma.bank.findMany({ where: { userId } });
  const bankAccounts = await prisma.bankAccount.findMany({
    where: {
      bankId: {
        in: banks.map((x) => x.id),
      },
      userId,
    },
  });
  const dbOpenBankingAccounts = await prisma.openBankingAccount.findMany({
    where: {
      bankAccountId: {
        in: bankAccounts.map((x) => x.id),
      },
      userId,
    },
  });

  const dbTokens = await prisma.openBankingToken.findMany({
    where: {
      bankId: {
        in: banks.map((x) => x.id),
      },
      userId,
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
      fetchTransactionsForSingleBank(x, accountsByToken[x.id] ?? [])
    )
  );
  return Object.assign({}, ...obDataParts);
}

async function fetchTransactionsForSingleBank(
  tokenIn: OpenBankingToken,
  accounts: OpenBankingAccount[]
): Promise<IOBTransactionsByAccountId> {
  if (!accounts.length) {
    return;
  }
  const token = await maybeRefreshToken(tokenIn);
  const init = {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  };
  const transactionsByAccountId: IOBTransactionsByAccountId = {};
  const fetches = [];
  for (const account of accounts) {
    transactionsByAccountId[account.bankAccountId] ??= [];
    const out = transactionsByAccountId[account.bankAccountId];
    fetches.push(
      fetch(obSettledTxURL(account.openBankingAccountId), init)
        .then((r) => r.json())
        .then((x) =>
          out.push(...postProcess({ settled: true, results: x.results }))
        )
    );
    fetches.push(
      fetch(obPendingTxURL(account.openBankingAccountId), init)
        .then((r) => r.json())
        .then((x) =>
          out.push(...postProcess({ settled: false, results: x.results }))
        )
    );
  }
  await Promise.all(fetches);
  const transactionsByAccountIdSorted = Object.fromEntries(
    Object.entries(transactionsByAccountId).map(([accountId, transactions]) => {
      transactions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      return [accountId, transactions];
    })
  );
  return transactionsByAccountIdSorted;
}

function postProcess(arg: { settled: boolean; results: IOBTransaction[] }) {
  return arg.results.map((t: IOBTransaction) => {
    logIfExtraFields(t);
    const copy = Object.assign(t, {
      settled: arg.settled,
      true_layer_transaction_id: t.transaction_id,
    });
    // Reverse engineered attempt to keep the same transaction id before and after transaction settled.
    if (t.provider_transaction_id) {
      copy.transaction_id = t.provider_transaction_id;
    }
    // Starling reports the actual transaction time in a meta field.
    // Prefer it over the time when the transaction was settled.
    if (t.meta.transaction_time) {
      copy.timestamp = t.meta.transaction_time;
    }
    return copy;
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
