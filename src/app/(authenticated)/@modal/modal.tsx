'use client';
import {NewTransactionFormDialog} from '@/components/txform/TransactionForm';
import {AllDatabaseDataContextProvider} from '@/lib/context/AllDatabaseDataContext';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {useRouter} from 'next/navigation';

export function NewTransactionModal({dbData}: {dbData: AllDatabaseData}) {
  const router = useRouter();
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NewTransactionFormDialog
        transaction={null}
        open={true}
        onOpenChange={() => router.back()}
      />
    </AllDatabaseDataContextProvider>
  );
}
