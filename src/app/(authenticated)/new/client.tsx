'use client';
import {
  isFullyConfigured,
  NotConfiguredYet,
} from '@/components/NotConfiguredYet';
import {TransactionForm} from '@/components/txform/TransactionForm';
import {CoreDataContextProvider} from '@/lib/context/CoreDataContext';
import {MarketDataContextProvider} from '@/lib/context/MarketDataContext';
import {TransactionDataContextProvider} from '@/lib/context/TransactionDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {useRouter} from 'next/navigation';

export function NewTransactionForm({dbData}: {dbData: AllDatabaseData}) {
  const router = useRouter();
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <CoreDataContextProvider dbData={dbData}>
      <TransactionDataContextProvider dbData={dbData}>
        <MarketDataContextProvider dbData={dbData}>
          <main className="space-y-6 p-6">
            <TransactionForm
              transaction={null}
              onClose={() => {
                router.back();
              }}
            />
          </main>
        </MarketDataContextProvider>
      </TransactionDataContextProvider>
    </CoreDataContextProvider>
  );
}
