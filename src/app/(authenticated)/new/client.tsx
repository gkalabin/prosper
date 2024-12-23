'use client';
import {
  isFullyConfigured,
  NotConfiguredYet,
} from '@/components/NotConfiguredYet';
import {TransactionForm} from '@/components/txform/TransactionForm';
import {AllDatabaseDataContextProvider} from '@/lib/context/AllDatabaseDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {useRouter} from 'next/navigation';

export function NewTransactionForm({dbData}: {dbData: AllDatabaseData}) {
  const router = useRouter();
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <main className="space-y-6 p-6">
        <TransactionForm
          transaction={null}
          onClose={() => {
            router.back();
          }}
        />
      </main>
    </AllDatabaseDataContextProvider>
  );
}
