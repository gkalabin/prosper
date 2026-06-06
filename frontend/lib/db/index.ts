import {AuthContext} from '@/lib/auth/user';
import {
  fetchCoreData,
  fetchMarketData,
  fetchTransactionData,
} from '@/lib/db/fetch';
import {AppData} from '@/lib/model/AppDataModel';

// fetchAppData loads the per-user core, transaction and market
// data slices.
export async function fetchAppData(auth: AuthContext): Promise<AppData> {
  const [core, transaction, market] = await Promise.all([
    fetchCoreData(auth),
    fetchTransactionData(auth),
    fetchMarketData(auth),
  ]);
  return {
    ...core,
    ...transaction,
    ...market,
  };
}
