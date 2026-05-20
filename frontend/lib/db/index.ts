import {AuthContext} from '@/lib/auth/user';
import {
  cachedCoreDataOrFetch,
  cachedMarketDataOrFetch,
  cachedTransactionDataOrFetch,
} from '@/lib/db/cache';
import {AppData} from '@/lib/model/AppDataModel';

// fetchAppData loads the per-user core, transaction and market
// data slices.
export async function fetchAppData(auth: AuthContext): Promise<AppData> {
  const [core, transaction, market] = await Promise.all([
    cachedCoreDataOrFetch(auth),
    cachedTransactionDataOrFetch(auth),
    cachedMarketDataOrFetch(auth),
  ]);
  return {
    ...core,
    ...transaction,
    ...market,
  };
}
