import {
  fetchCoreData,
  fetchMarketData,
  fetchTransactionData,
} from '@/lib/db/fetch';
import {revalidateTag, unstable_cache, updateTag} from 'next/cache';

// This is a hack for BigInt serialization requiredd by nextjs unstable_cache.
declare global {
  interface BigInt {
    toJSON(): number;
  }
}
BigInt.prototype.toJSON = function () {
  return Number(this);
};

function transactionCacheKey(userId: number) {
  return `db-transactions-user-${userId}`;
}

export function cachedTransactionDataOrFetch(userId: number) {
  const cache = unstable_cache(
    async () => {
      console.log(`[db] transaction data CACHE MISS for userId:${userId}`);
      return await fetchTransactionData({userId});
    },
    [userId.toString()],
    {
      tags: [transactionCacheKey(userId)],
    }
  );
  return cache();
}

export async function updateTransactionDataCache(userId: number) {
  console.log(`[db] INVALIDATE TRANSACTION DATA CACHE for userId:${userId}`);
  updateTag(transactionCacheKey(userId));
}

function coreCacheKey(userId: number) {
  return `db-core-user-${userId}`;
}

export function cachedCoreDataOrFetch(userId: number) {
  const cache = unstable_cache(
    async () => {
      console.log(`[db] core data CACHE MISS for userId:${userId}`);
      return await fetchCoreData({userId});
    },
    [userId.toString()],
    {
      tags: [coreCacheKey(userId)],
    }
  );
  return cache();
}

export async function invalidateCoreDataCache(userId: number) {
  console.log(`[db] INVALIDATE CORE DATA CACHE for userId:${userId}`);
  revalidateTag(coreCacheKey(userId), 'max');
}

export async function updateCoreDataCache(userId: number) {
  console.log(`[db] INVALIDATE CORE DATA CACHE for userId:${userId}`);
  updateTag(coreCacheKey(userId));
}

// The market data is not specific to a user, so we use a single cache key.
const marketCacheKey = 'db-market-data';

export function cachedMarketDataOrFetch(userId: number) {
  const cache = unstable_cache(
    async () => {
      console.log(`[db] market data CACHE MISS for userId:${userId}`);
      return await fetchMarketData({userId});
    },
    [userId.toString()],
    {
      tags: [marketCacheKey],
    }
  );
  return cache();
}

export async function invalidateMarketDataCache(userId: number) {
  console.log(`[db] INVALIDATE MARKET DATA CACHE for userId:${userId}`);
  revalidateTag(marketCacheKey, 'max');
}
