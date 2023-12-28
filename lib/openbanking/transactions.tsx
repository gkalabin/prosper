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

export async function fetchOpenBankingTransactions(): Promise<IOBTransactionsByAccountId> {
  const banks = await prisma.bank.findMany();
  const bankAccounts = await prisma.bankAccount.findMany({
    where: {
      bankId: {
        in: banks.map((x) => x.id),
      },
    },
  });
  const dbOpenBankingAccounts = await prisma.openBankingAccount.findMany({
    where: {
      bankAccountId: {
        in: bankAccounts.map((x) => x.id),
      },
    },
  });

  const dbTokens = await prisma.openBankingToken.findMany({
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
    const append = (arg: { settled: boolean; results: IOBTransaction[] }) => {
      const newEntries = arg.results
        .map((t: IOBTransaction) => Object.assign(t, { settled: arg.settled }))
        .map(findMissing);
      out.push(...newEntries);
    };
    fetches.push(
      fetch(obSettledTxURL(account.openBankingAccountId), init)
        .then((r) => r.json())
        .then((x) => append({ settled: true, results: x.results }))
    );
    fetches.push(
      fetch(obPendingTxURL(account.openBankingAccountId), init)
        .then((r) => r.json())
        .then((x) => append({ settled: false, results: x.results }))
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

let limit = 3;

function findMissing(t: IOBTransaction): IOBTransaction {
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
    if (Object.keys(rest).length && limit > 0) {
      console.log("diff", JSON.stringify(rest, null, 2));
      limit--;
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
      ...rest
    } = t.meta;
    if (Object.keys(rest).length && limit > 0) {
      console.log("diff meta", JSON.stringify(rest, null, 2));
      limit--;
    }
  }
  return t;
}
