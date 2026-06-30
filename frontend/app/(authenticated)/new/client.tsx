'use client';
import {AppDataContextProviders} from '@/lib/context/AppDataContextProviders';
import {
  isFullyConfigured,
  NotConfiguredYet,
} from '@/components/NotConfiguredYet';
import {TransactionForm} from '@/components/txform/TransactionForm';
import {AppData} from '@/lib/model/AppDataModel';
import {useRouter} from 'next/navigation';

export function NewTransactionForm({dbData}: {dbData: AppData}) {
  const router = useRouter();
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AppDataContextProviders dbData={dbData}>
      <main className="space-y-6 p-6">
        <TransactionForm
          transaction={null}
          onClose={() => {
            router.back();
          }}
        />
      </main>
    </AppDataContextProviders>
  );
}
