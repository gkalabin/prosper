import {TransactionFormSchema} from '@/components/txform/types';
import {useFormContext, useWatch} from 'react-hook-form';

// usePayerName returns the name of the person who paid the expense, or null if empty.
export function usePayerName(): string | null {
  const {control} = useFormContext<TransactionFormSchema>();
  const payer = useWatch({control, name: 'expense.payer', exact: true});
  return payer?.trim() || null;
}
