import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {uniqMostFrequentIgnoringEmpty} from '@/lib/collections';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {otherPartyNameOrNull} from '@/lib/model/transaction/Transaction';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Companion({
  fieldName,
}: {
  fieldName: 'expense.companion' | 'income.companion';
}) {
  const {control} = useFormContext<TransactionFormSchema>();
  const companions = useUniqueCompanions();
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({field}) => (
        <FormItem className="col-span-3">
          <FormLabel>Shared with</FormLabel>
          <FormControl>
            <Input
              type="text"
              datalist={companions}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function useUniqueCompanions(): string[] {
  const {transactions} = useTransactionDataContext();
  return useMemo(
    () => uniqMostFrequentIgnoringEmpty(transactions.map(otherPartyNameOrNull)),
    [transactions]
  );
}
