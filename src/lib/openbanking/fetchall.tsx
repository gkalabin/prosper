import {DB} from '@/lib/db';
import {
  AccountBalance,
  AccountDetails,
  ConnectionExpiration,
  Transaction,
} from '@/lib/openbanking/interface';
import {fetchAccounts as nordigenFetchAccounts} from '@/lib/openbanking/nordigen/account';
import {fetchBalance as nordigenFetchBalance} from '@/lib/openbanking/nordigen/balance';
import {refreshToken as nordigenRefreshToken} from '@/lib/openbanking/nordigen/token';
import {fetchTransactions as nordigenFetchTransactions} from '@/lib/openbanking/nordigen/transactions';
import {fetchAccounts as starlingFetchAccounts} from '@/lib/openbanking/starling/account';
import {fetchBalance as starlingFetchBalance} from '@/lib/openbanking/starling/balance';
import {fetchTransactions as starlingFetchTransactions} from '@/lib/openbanking/starling/transactions';
import {fetchAccounts as trueLayerFetchAccounts} from '@/lib/openbanking/truelayer/account';
import {fetchBalance as trueLayerFetchBalance} from '@/lib/openbanking/truelayer/balance';
import {refreshToken as trueLayerRefreshToken} from '@/lib/openbanking/truelayer/token';
import {fetchTransactions as trueLayerFetchTransactions} from '@/lib/openbanking/truelayer/transactions';
import {
  WithdrawalOrDepositPrototype,
  fromOpenBankingTransaction,
} from '@/lib/txsuggestions/TransactionPrototype';
import {notEmpty} from '@/lib/util/util';
import {
  ExternalAccountMapping,
  NordigenToken,
  StarlingToken,
  TrueLayerToken,
} from '@prisma/client';
import {isBefore} from 'date-fns';

type Token = TrueLayerToken | NordigenToken | StarlingToken;

class Provider<T extends Token> {
  constructor(
    readonly name: 'Starling' | 'TrueLayer' | 'Nordigen',
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

const providers: Provider<Token>[] = [
  new Provider<TrueLayerToken>(
    'TrueLayer',
    async (db: DB) => await db.trueLayerTokenFindMany(),
    trueLayerRefreshToken,
    trueLayerFetchBalance,
    trueLayerFetchTransactions,
    trueLayerFetchAccounts
  ),
  new Provider<NordigenToken>(
    'Nordigen',
    async (db: DB) => await db.nordigenTokenFindMany(),
    nordigenRefreshToken,
    nordigenFetchBalance,
    nordigenFetchTransactions,
    async (
      token: NordigenToken,
      db: DB,
      bankId: number
    ): Promise<AccountDetails[]> => {
      const requisition = await db.nordigenRequisitionFindFirst({
        where: {
          bankId,
        },
      });
      if (!requisition) {
        return [];
      }
      return await nordigenFetchAccounts(token, requisition);
    }
  ),
  new Provider<StarlingToken>(
    'Starling',
    async (db: DB) => await db.starlingTokenFindMany(),
    async (db: DB, t: StarlingToken) => t,
    starlingFetchBalance,
    starlingFetchTransactions,
    starlingFetchAccounts
  ),
];

export async function getExpirations(db: DB): Promise<ConnectionExpiration[]> {
  const result: ConnectionExpiration[] = [];
  for (const provider of providers) {
    const dbTokens = await provider.fetchTokens(db);
    result.push(
      ...dbTokens.map(t => ({
        bankId: t.bankId,
        expirationEpoch: t.refreshValidUntil.getTime(),
      }))
    );
  }
  return result;
}

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

interface ProviderToken<T extends Token> {
  provider: Provider<T>;
  token: T;
}

async function fetchTokensFromDB(db: DB): Promise<ProviderToken<Token>[]> {
  const fetches = providers.map(async p => {
    try {
      const r = await p.fetchTokens(db);
      return r.map(t => ({token: t, provider: p}));
    } catch (err) {
      console.warn(`Fetching ${p.name} tokens from db failed`, err);
      return [];
    }
  });
  const fetched = await Promise.all(fetches);
  return fetched.flat();
}

async function refreshTokens(
  db: DB,
  maybeStaleTokens: ProviderToken<Token>[]
): Promise<ProviderToken<Token>[]> {
  const now = new Date();
  const refreshes = maybeStaleTokens.map(async pt => {
    const {provider, token} = pt;
    if (isBefore(now, token.accessValidUntil)) {
      return pt;
    }
    try {
      pt.token = await provider.refreshToken(db, token);
      return pt;
    } catch (err) {
      throw new Error(
        `Refreshing ${provider.name} token for bank id ${token.bankId} failed`,
        {cause: err}
      );
    }
  });
  const completedRefreshes = await Promise.allSettled(refreshes);
  logErrors(completedRefreshes);
  return allSuccessful(completedRefreshes);
}

function allSuccessful<T>(ps: PromiseSettledResult<Awaited<T>>[]): T[] {
  return ps
    .map(r => (r.status == 'fulfilled' ? r.value : null))
    .filter(notEmpty);
}

function logErrors(ps: PromiseSettledResult<Awaited<unknown>>[]): void {
  ps.forEach(t => {
    if (t.status == 'fulfilled') {
      return;
    }
    console.warn(t.reason);
  });
}

async function genericFetch<D>(
  db: DB,
  fn: (p: Provider<Token>, t: Token, m: ExternalAccountMapping) => Promise<D>
): Promise<D[]> {
  const maybeStaleTokens = await fetchTokensFromDB(db);
  const freshTokens = await refreshTokens(db, maybeStaleTokens);
  const [bankAccounts, allMappings] = await Promise.all([
    db.bankAccountFindMany(),
    db.externalAccountMappingFindMany(),
  ]);
  const fetches: Promise<D>[] = [];
  for (const {provider, token} of freshTokens) {
    const tokenAccounts = new Set(
      bankAccounts.filter(a => a.bankId == token.bankId).map(a => a.id)
    );
    const tokenMappings = allMappings.filter(m =>
      tokenAccounts.has(m.internalAccountId)
    );
    const tokenFetches = tokenMappings.map(async m => {
      try {
        return await fn(provider, token, m);
      } catch (err) {
        throw new Error(
          `Failed to fetch ${provider.name} for bank ${token.bankId} and account ${m.internalAccountId}`,
          {cause: err}
        );
      }
    });
    fetches.push(...tokenFetches);
  }
  const completedFetches = await Promise.allSettled(fetches);
  logErrors(completedFetches);
  return allSuccessful(completedFetches);
}

export async function fetchAccountsForBank(
  db: DB,
  bankId: number
): Promise<AccountDetails[]> {
  for (const provider of providers) {
    const dbTokens = await provider.fetchTokens(db);
    const token = dbTokens.find(t => t.bankId == bankId);
    if (!token) {
      continue;
    }
    const freshToken = await provider.refreshToken(db, token);
    return await provider.fetchAccounts(freshToken, db, bankId);
  }
  return [];
}
