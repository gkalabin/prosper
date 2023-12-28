import {
  BankAccount,
  ExternalAccountMapping,
  NordigenToken,
  TrueLayerToken,
} from "@prisma/client";
import { DB } from "lib/db";
import { AccountBalance, IOpenBankingData } from "lib/openbanking/interface";
import { fetchBalance as nordigenFetchBalance } from "lib/openbanking/nordigen/balance";
import { maybeRefreshToken as nordigenMaybeRefreshToken } from "lib/openbanking/nordigen/token";
import { fetchTransactions as nordigenFetchTransactions } from "lib/openbanking/nordigen/transactions";
import { fetchBalance as trueLayerFetchBalance } from "lib/openbanking/truelayer/balance";
import { maybeRefreshToken as trueLayerMaybeRefreshToken } from "lib/openbanking/truelayer/token";
import { fetchTransactions as trueLayerFetchTransactions } from "lib/openbanking/truelayer/transactions";
import { WithdrawalOrDepositPrototype } from "lib/txsuggestions/TransactionPrototype";

export const fetchOpenBankingData = async (
  db: DB
): Promise<IOpenBankingData> => {
  return {
    balances: await fetchBalances(db),
    newPrototypes: await fetchTransactions(db),
    usedPrototypes: await db.transactionPrototypeFindMany(),
  };
};

// TODO: the next two functions are very similar, we should reduce logic duplication.
export async function fetchBalances(db: DB): Promise<AccountBalance[]> {
  const internalBankAccounts = await db.bankAccountFindMany();
  const mappings = await db.externalAccountMappingFindMany();
  const fetches: Promise<AccountBalance>[] = [];
  {
    const dbTokens = await db.trueLayerTokenFindMany();
    const tokens = await Promise.all(dbTokens.map(trueLayerMaybeRefreshToken));
    const trueLayerFetches = tokens.flatMap((token) =>
      mappingsForToken(token, internalBankAccounts, mappings).map((m) =>
        trueLayerFetchBalance(token, m)
      )
    );
    fetches.push(...trueLayerFetches);
  }
  {
    const dbTokens = await db.nordigenTokenFindMany();
    const tokens = await Promise.all(dbTokens.map(nordigenMaybeRefreshToken));
    const nordigenFetches = tokens.flatMap((token) =>
      mappingsForToken(token, internalBankAccounts, mappings).map((m) =>
        nordigenFetchBalance(token, m)
      )
    );
    fetches.push(...nordigenFetches);
  }
  const balances = await Promise.all(fetches);
  return balances.flat().filter((x) => !!x);
}

export async function fetchTransactions(
  db: DB
): Promise<WithdrawalOrDepositPrototype[]> {
  const internalBankAccounts = await db.bankAccountFindMany();
  const mappings = await db.externalAccountMappingFindMany();
  const fetches: Promise<WithdrawalOrDepositPrototype[]>[] = [];
  {
    const dbTokens = await db.trueLayerTokenFindMany();
    const tokens = await Promise.all(dbTokens.map(trueLayerMaybeRefreshToken));
    const trueLayerFetches = tokens.flatMap((token) =>
      mappingsForToken(token, internalBankAccounts, mappings).map((m) =>
        trueLayerFetchTransactions(token, m)
      )
    );
    fetches.push(...trueLayerFetches);
  }
  {
    const dbTokens = await db.nordigenTokenFindMany();
    const tokens = await Promise.all(dbTokens.map(nordigenMaybeRefreshToken));
    const nordigenFetches = tokens.flatMap((token) =>
      mappingsForToken(token, internalBankAccounts, mappings).map((m) =>
        nordigenFetchTransactions(token, m)
      )
    );
    fetches.push(...nordigenFetches);
  }
  const transactions = await Promise.all(fetches);
  return transactions.flat().filter((x) => !!x);
}

function mappingsForToken(
  token: TrueLayerToken | NordigenToken,
  internalBankAccounts: BankAccount[],
  mappings: ExternalAccountMapping[]
) {
  const accounts = internalBankAccounts.filter((a) => a.bankId == token.bankId);
  return mappings.filter((m) =>
    accounts.some((a) => a.id == m.internalAccountId)
  );
}
