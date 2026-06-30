import {AuthContext} from '@/lib/auth/user';
import {
  fetchCoreData,
  fetchMarketData,
  fetchOpenBankingMetadata,
  fetchTransactionData,
} from '@/lib/db/fetch';
import {AppData} from '@/lib/model/AppDataModel';

// fetchAppData loads all the app data slices.
export async function fetchAppData(auth: AuthContext): Promise<AppData> {
  const [core, transaction, market, openBankingMetadata] = await Promise.all([
    fetchCoreData(auth),
    fetchTransactionData(auth),
    fetchMarketData(auth),
    fetchOpenBankingMetadata(auth),
  ]);
  return {
    ...core,
    ...transaction,
    ...market,
    ...openBankingMetadata,
  };
}
