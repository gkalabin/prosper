'use client';
import {AppDataContextProviders} from '@/lib/context/AppDataContextProviders';
import {NewTransactionFormDialog} from '@/components/txform/TransactionForm';
import {AppData} from '@/lib/model/AppDataModel';
import {useRouter} from 'next/navigation';

export function NewTransactionModal({dbData}: {dbData: AppData}) {
  const router = useRouter();
  return (
    <AppDataContextProviders dbData={dbData}>
      <NewTransactionFormDialog
        transaction={null}
        open={true}
        onOpenChange={() => router.back()}
      />
    </AppDataContextProviders>
  );
}
