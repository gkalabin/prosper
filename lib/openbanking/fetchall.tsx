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
  Transaction,
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
import {
  WithdrawalOrDepositPrototype,
  fromOpenBankingTransaction,
} from "lib/txsuggestions/TransactionPrototype";

type Token = TrueLayerToken | NordigenToken | StarlingToken;

class Provider<T = Token> {
  constructor(
    readonly fetchTokens: (db: DB) => Promise<T[]>,
    readonly refreshToken: (db: DB, token: T) => Promise<T>,
    readonly fetchBalance: (
      token: T,
      mapping: ExternalAccountMapping
    ) => Promise<AccountBalance>,
    readonly fetchTransactions: (
      token: T,
      mapping: ExternalAccountMapping
    ) => Promise<Transaction[]>,
    readonly fetchAccounts: (
      token: T,
      db: DB,
      bankId: number
    ) => Promise<AccountDetails[]>
  ) {}
}

const providers: Provider[] = [
  new Provider<TrueLayerToken>(
    async (db: DB) => await db.trueLayerTokenFindMany(),
    trueLayerMaybeRefreshToken,
    trueLayerFetchBalance,
    trueLayerFetchTransactions,
    trueLayerFetchAccounts
  ),
  new Provider<NordigenToken>(
    async (db: DB) => await db.nordigenTokenFindMany(),
    nordigenMaybeRefreshToken,
    nordigenFetchBalance,
    nordigenFetchTransactions,
    async (token: NordigenToken, db: DB, bankId: number) => {
      const requisition = await db.nordigenRequisitionFindFirst({
        where: {
          bankId,
        },
      });
      return await nordigenFetchAccounts(token, requisition);
    }
  ),
  new Provider<StarlingToken>(
    async (db: DB) => await db.starlingTokenFindMany(),
    async (db: DB, t: StarlingToken) => t,
    starlingFetchBalance,
    starlingFetchTransactions,
    starlingFetchAccounts
  ),
];

// TODO: the next two functions are very similar, we should reduce logic duplication.
export async function fetchBalances(db: DB): Promise<AccountBalance[]> {
  return await genericFetch(
    db,
    (p: Provider<Token>, t: Token, m: ExternalAccountMapping) =>
      p.fetchBalance(t, m)
  );
}

export async function fetchTransactions(
  db: DB
): Promise<WithdrawalOrDepositPrototype[]> {
  const transactions = await genericFetch(
    db,
    (p: Provider<Token>, t: Token, m: ExternalAccountMapping) =>
      p.fetchTransactions(t, m)
  );
  return transactions.flat().map(fromOpenBankingTransaction);
}

async function genericFetch<D>(
  db: DB,
  fn: (p: Provider<Token>, t: Token, m: ExternalAccountMapping) => Promise<D>
): Promise<D[]> {
  const internalBankAccounts = await db.bankAccountFindMany();
  const mappings = await db.externalAccountMappingFindMany();
  const fetches: Promise<D>[] = [];
  for (const provider of providers) {
    const dbTokens = await provider.fetchTokens(db);
    const tokens = await Promise.allSettled(
      dbTokens.map((t) => provider.refreshToken(db, t))
    );
    const successfulTokens = tokens
      .map((t) => {
        if (t.status == "fulfilled") {
          return t.value;
        }
        console.warn("Failed to refresh token: " + t.reason);
        return null;
      })
      .filter((x) => !!x);
    const providerFetches = successfulTokens.flatMap((token) =>
      mappingsForToken(token, internalBankAccounts, mappings).map((m) =>
        fn(provider, token, m)
      )
    );
    fetches.push(...providerFetches);
  }
  const settled = await Promise.allSettled(fetches);
  const successfulFetches = settled
    .map((x) => {
      if (x.status == "fulfilled") {
        return x.value;
      }
      console.warn("Failed to fetch: " + x.reason);
      return null;
    })
    .filter((x) => !!x);
  return successfulFetches;
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
  for (const provider of providers) {
    const dbTokens = await provider.fetchTokens(db);
    const token = dbTokens.find((t) => t.bankId == bankId);
    if (!token) {
      continue;
    }
    const freshToken = await provider.refreshToken(db, token);
    return await provider.fetchAccounts(freshToken, db, bankId);
  }
  console.warn("No accounts found", bankId);
  return null;
}
