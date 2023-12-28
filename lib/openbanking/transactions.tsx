import { OpenBankingAccount, OpenBankingToken } from "@prisma/client";
import { maybeRefreshToken } from "lib/openbanking/token";
import prisma from "lib/prisma";

const obSettledTxURL = (accountId: string) =>
  `https://api.truelayer.com/data/v1/accounts/${accountId}/transactions`;
const obPendingTxURL = (accountId: string) =>
  `https://api.truelayer.com/data/v1/accounts/${accountId}/transactions/pending`;

export async function fetchOpenBankingTransactions() {
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
) {
  if (!accounts.length) {
    return;
  }
  const token = await maybeRefreshToken(tokenIn);
  const init = {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}` },
  };
  const obDataByAccountId = {};
  const fetches = [];
  for (const account of accounts) {
    obDataByAccountId[account.bankAccountId] ??= {};
    const out = obDataByAccountId[account.bankAccountId];
    fetches.push(
      fetch(obSettledTxURL(account.openBankingAccountId), init)
        .then((r) => r.json())
        .then((x) => (out.settled = x.results))
    );
    fetches.push(
      fetch(obPendingTxURL(account.openBankingAccountId), init)
        .then((r) => r.json())
        .then((x) => (out.pending = x.results))
    );
  }
  await Promise.all(fetches);
  return obDataByAccountId;
}
