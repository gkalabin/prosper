import {assertDefined} from '@/lib/assert';
import {AuthContext} from '@/lib/auth/user';
import {withAuth} from '@/lib/grpc/auth';
import {
  DisplaySettings,
  GetCoreDataResponse,
  GetTransactionsResponse,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {GetMarketDataForUserResponse} from '@/lib/grpc/gen/prosper/v1/rates';
import {ledgerClient, ratesClient} from '@/lib/grpc/client';
import {unstable_cache, updateTag} from 'next/cache';

// Next.js' unstable_cache serialises return values to JSON via
// JSON.stringify and protobuf-ts returns BigInt for int64 fields, which
// JSON.stringify cannot handle on its own. We round-trip BigInt as a
// tagged string so no precision is lost — encodeBigints runs before the
// cache stores the value, decodeBigints runs on every read.
const BIGINT_TAG = '__bigint__';

function encodeBigints<T>(value: T): T {
  return walkEncode(value) as T;
}

function walkEncode(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return `${BIGINT_TAG}${value.toString()}`;
  }
  if (Array.isArray(value)) {
    return value.map(walkEncode);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = walkEncode(v);
    }
    return out;
  }
  return value;
}

function decodeBigints<T>(value: T): T {
  return walkDecode(value) as T;
}

function walkDecode(value: unknown): unknown {
  if (typeof value === 'string' && value.startsWith(BIGINT_TAG)) {
    const digits = value.slice(BIGINT_TAG.length);
    if (!/^-?\d+$/.test(digits)) {
      throw new Error(`malformed cached bigint: ${JSON.stringify(value)}`);
    }
    return BigInt(digits);
  }
  if (Array.isArray(value)) {
    return value.map(walkDecode);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = walkDecode(v);
    }
    return out;
  }
  return value;
}

// CoreData refines the proto response so callers can rely on
// displaySettings being present — fetchCoreData asserts it before
// caching, so a missing row fails fast instead of leaking into every
// page that reads it.
export type CoreData = Omit<GetCoreDataResponse, 'displaySettings'> & {
  displaySettings: DisplaySettings;
};

function transactionCacheKey(userId: number) {
  return `db-transactions-user-${userId}`;
}

async function fetchTransactionData(
  auth: AuthContext
): Promise<GetTransactionsResponse> {
  const {response} = await ledgerClient.getTransactions(withAuth({}, auth));
  return response;
}

export async function cachedTransactionDataOrFetch(
  auth: AuthContext
): Promise<GetTransactionsResponse> {
  const cache = unstable_cache(
    async () => {
      console.log(`[db] transaction data CACHE MISS for userId:${auth.userId}`);
      return encodeBigints(await fetchTransactionData(auth));
    },
    [auth.userId.toString()],
    {tags: [transactionCacheKey(auth.userId)]}
  );
  return decodeBigints(await cache());
}

export async function updateTransactionDataCache(userId: number) {
  console.log(`[db] INVALIDATE TRANSACTION DATA CACHE for userId:${userId}`);
  updateTag(transactionCacheKey(userId));
}

function coreCacheKey(userId: number) {
  return `db-core-user-${userId}`;
}

async function fetchCoreData(auth: AuthContext): Promise<CoreData> {
  const {response} = await ledgerClient.getCoreData(withAuth({}, auth));
  assertDefined(
    response.displaySettings,
    `display settings missing for user ${auth.userId}`
  );
  return response as CoreData;
}

export async function cachedCoreDataOrFetch(
  auth: AuthContext
): Promise<CoreData> {
  const cache = unstable_cache(
    async () => {
      console.log(`[db] core data CACHE MISS for userId:${auth.userId}`);
      return encodeBigints(await fetchCoreData(auth));
    },
    [auth.userId.toString()],
    {tags: [coreCacheKey(auth.userId)]}
  );
  return decodeBigints(await cache());
}

export async function updateCoreDataCache(userId: number) {
  console.log(`[db] INVALIDATE CORE DATA CACHE for userId:${userId}`);
  updateTag(coreCacheKey(userId));
}

// Market data is per-user (it depends on the user's display currency),
// but the cache tag is shared so a global rate refresh could fan-out.
const marketCacheKey = 'db-market-data';

async function fetchMarketData(
  auth: AuthContext
): Promise<GetMarketDataForUserResponse> {
  const {response} = await ratesClient.getMarketDataForUser(withAuth({}, auth));
  return response;
}

export async function cachedMarketDataOrFetch(
  auth: AuthContext
): Promise<GetMarketDataForUserResponse> {
  const cache = unstable_cache(
    async () => {
      console.log(`[db] market data CACHE MISS for userId:${auth.userId}`);
      return encodeBigints(await fetchMarketData(auth));
    },
    [auth.userId.toString()],
    {tags: [marketCacheKey]}
  );
  return decodeBigints(await cache());
}

export async function invalidateMarketDataCache(userId: number) {
  console.log(`[db] INVALIDATE MARKET DATA CACHE for userId:${userId}`);
  updateTag(marketCacheKey);
}
