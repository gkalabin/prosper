import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {CoreData} from '@/lib/db/fetch';
import {GetTransactionsResponse} from '@/lib/grpc/gen/prosper/v1/ledger';
import {GetMarketDataForUserResponse} from '@/lib/grpc/gen/prosper/v1/rates';

// AppData is the union of every page-load gRPC response. Each page
// fetches the three slices it needs (CoreData, TransactionData,
// MarketData) and passes the merged value to the context providers.
export type AppData = CoreData &
  GetTransactionsResponse &
  GetMarketDataForUserResponse;

export const useDisplayBankAccounts = () => {
  const {bankAccounts} = useCoreDataContext();
  return bankAccounts.filter(x => !x.archived);
};
