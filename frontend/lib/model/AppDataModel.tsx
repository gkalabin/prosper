import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {CoreData} from '@/lib/db/fetch';
import {GetTransactionsResponse} from '@/lib/grpc/gen/prosper/v1/ledger';
import {GetFetchMetadataResponse} from '@/lib/grpc/gen/prosper/v1/openbanking';
import {GetMarketDataForUserResponse} from '@/lib/grpc/gen/prosper/v1/rates';

// AppData is the union of the page-load gRPC responses every page needs:
// CoreData, TransactionData, MarketData and the open banking fetch metadata
// (GetFetchMetadataResponse). Each page fetches the merged value and passes
// it to the context providers.
export type AppData = CoreData &
  GetTransactionsResponse &
  GetMarketDataForUserResponse &
  GetFetchMetadataResponse;

export const useDisplayBankAccounts = () => {
  const {bankAccounts} = useCoreDataContext();
  return bankAccounts.filter(x => !x.archived);
};
