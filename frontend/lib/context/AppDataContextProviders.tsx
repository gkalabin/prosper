'use client';
import {CoreDataContextProvider} from '@/lib/context/CoreDataContext';
import {MarketDataContextProvider} from '@/lib/context/MarketDataContext';
import {TransactionDataContextProvider} from '@/lib/context/TransactionDataContext';
import {AppData} from '@/lib/model/AppDataModel';
import {OpenBankingFetchMetadataProvider} from '@/lib/openbanking/context';

// AppDataContextProviders wires the per-user app data slices into their React contexts.
export function AppDataContextProviders({
  dbData,
  children,
}: {
  dbData: AppData;
  children: JSX.Element | JSX.Element[];
}) {
  return (
    <CoreDataContextProvider dbData={dbData}>
      <TransactionDataContextProvider dbData={dbData}>
        <MarketDataContextProvider dbData={dbData}>
          <OpenBankingFetchMetadataProvider dbData={dbData}>
            {children}
          </OpenBankingFetchMetadataProvider>
        </MarketDataContextProvider>
      </TransactionDataContextProvider>
    </CoreDataContextProvider>
  );
}
