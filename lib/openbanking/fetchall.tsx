import {
  BankAccount,
  ExternalAccountMapping,
  NordigenToken,
  StarlingToken,
  TrueLayerToken,
} from "@prisma/client";
import { DB } from "lib/db";
import {
  AccountBalance,
  AccountDetails,
  IOpenBankingData,
} from "lib/openbanking/interface";
import { fetchAccounts as nordigenFetchAccounts } from "lib/openbanking/nordigen/account";
import { fetchBalance as nordigenFetchBalance } from "lib/openbanking/nordigen/balance";
import { maybeRefreshToken as nordigenMaybeRefreshToken } from "lib/openbanking/nordigen/token";
import { fetchTransactions as nordigenFetchTransactions } from "lib/openbanking/nordigen/transactions";
import { fetchAccounts as starlingFetchAccounts } from "lib/openbanking/starling/account";
import { fetchBalance as starlingFetchBalance } from "lib/openbanking/starling/balance";
import { fetchTransactions as starlingFetchTransactions } from "lib/openbanking/starling/transactions";
import { fetchAccounts as trueLayerFetchAccounts } from "lib/openbanking/truelayer/account";
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
  {
    const dbTokens = await db.starlingTokenFindMany();
    const starlingFetches = dbTokens.flatMap((token) =>
      mappingsForToken(token, internalBankAccounts, mappings).map((m) =>
        starlingFetchBalance(token, m)
      )
    );
    fetches.push(...starlingFetches);
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
  {
    const dbTokens = await db.starlingTokenFindMany();
    const starlingFetches = dbTokens.flatMap((token) =>
      mappingsForToken(token, internalBankAccounts, mappings).map((m) =>
        starlingFetchTransactions(token, m)
      )
    );
    fetches.push(...starlingFetches);
  }
  const fetchesWithErrorHandling = fetches.map(async (f) => {
    try {
      return await f;
    } catch (e) {
      console.error(e);
      return [];
    }
  });
  const transactions = await Promise.all(fetchesWithErrorHandling);
  return transactions.flat().filter((x) => !!x);
}

function mappingsForToken(
  token: TrueLayerToken | NordigenToken | StarlingToken,
  internalBankAccounts: BankAccount[],
  mappings: ExternalAccountMapping[]
) {
  const accounts = internalBankAccounts.filter((a) => a.bankId == token.bankId);
  return mappings.filter((m) =>
    accounts.some((a) => a.id == m.internalAccountId)
  );
}

export async function fetchAccounts(
  db: DB,
  bankId: number
): Promise<AccountDetails[]> {
  {
    const [dbToken] = await db.trueLayerTokenFindMany({
      where: { bankId },
    });
    if (dbToken) {
      const token = await trueLayerMaybeRefreshToken(dbToken);
      return await trueLayerFetchAccounts(token);
    }
  }
  {
    const [dbToken] = await db.nordigenTokenFindMany({
      where: { bankId },
    });
    const requisition = await db.nordigenRequisitionFindFirst({
      where: {
        bankId,
      },
    });
    if (requisition && dbToken) {
      const token = await nordigenMaybeRefreshToken(dbToken);
      return await nordigenFetchAccounts(token, requisition);
    }
  }
  {
    const [dbToken] = await db.starlingTokenFindMany({
      where: { bankId },
    });
    if (dbToken) {
      return await starlingFetchAccounts(dbToken);
    }
  }
  return null;
}
