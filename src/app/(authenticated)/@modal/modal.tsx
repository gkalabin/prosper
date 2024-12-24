'use client';
import {NewTransactionFormDialog} from '@/components/txform/TransactionForm';
import {CoreDataContextProvider} from '@/lib/context/CoreDataContext';
import {MarketDataContextProvider} from '@/lib/context/MarketDataContext';
import {TransactionDataContextProvider} from '@/lib/context/TransactionDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {useRouter} from 'next/navigation';

export function NewTransactionModal({dbData}: {dbData: AllDatabaseData}) {
  const router = useRouter();
  return (
    <CoreDataContextProvider dbData={dbData}>
      <TransactionDataContextProvider dbData={dbData}>
        <MarketDataContextProvider dbData={dbData}>
          <NewTransactionFormDialog
            transaction={null}
            open={true}
            onOpenChange={() => router.back()}
          />
        </MarketDataContextProvider>
      </TransactionDataContextProvider>
    </CoreDataContextProvider>
  );
}
