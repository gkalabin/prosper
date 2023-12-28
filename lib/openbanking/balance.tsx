import { OpenBankingAccount, OpenBankingToken } from "@prisma/client";
import { maybeRefreshToken } from "lib/openbanking/token";
import prisma from "lib/prisma";

const obBalanceURL = (accountId: string) =>
  `https://api.truelayer.com/data/v1/accounts/${accountId}/balance`;

export async function fetchBalances() {
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
      fetchAccountBalancesForSingleBank(x, accountsByToken[x.id] ?? [])
    )
  );
  return Object.assign({}, ...obDataParts);
}

async function fetchAccountBalancesForSingleBank(
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
  const balanceByAccountId = {};
  const fetches = [];
  for (const account of accounts) {
    fetches.push(
      fetch(obBalanceURL(account.openBankingAccountId), init)
        .then((r) => r.json())
        .then((x) => {
          if (!x.results?.length) {
            console.warn("No balance found", x);
            return;
          }
          const [{ available, overdraft }] = x.results;
          balanceByAccountId[account.bankAccountId] = Math.round(
            (available - overdraft) * 100
          );
        })
    );
  }
  await Promise.all(fetches);
  return balanceByAccountId;
}
