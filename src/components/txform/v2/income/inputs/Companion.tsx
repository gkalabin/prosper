import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {uniqMostFrequentIgnoringEmpty} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {otherPartyNameOrNull} from '@/lib/model/transaction/Transaction';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Companion() {
  const {control, watch} = useFormContext<TransactionFormSchema>();
  const companions = useUniqueCompanions();
  const isShared = watch('income.isShared');
  if (!isShared) {
    return null;
  }
  return (
    <FormField
      control={control}
      name="income.companion"
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
  const {transactions} = useAllDatabaseDataContext();
  return useMemo(
    () => uniqMostFrequentIgnoringEmpty(transactions.map(otherPartyNameOrNull)),
    [transactions]
  );
}