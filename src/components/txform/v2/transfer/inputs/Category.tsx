import {CategorySelect} from '@/components/txform/v2/shared/CategorySelect';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {isTransfer} from '@/lib/model/transaction/Transaction';
import {useCallback} from 'react';
import {useFormContext} from 'react-hook-form';

export function Category() {
  const {transactions} = useAllDatabaseDataContext();
  const {control} = useFormContext<TransactionFormSchema>();
  const getMostFrequentlyUsedCallback = useCallback(
    () =>
      uniqMostFrequent(transactions.filter(isTransfer).map(t => t.categoryId)),
    [transactions]
  );
  return (
    <FormField
      control={control}
      name="transfer.categoryId"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Category</FormLabel>
          <FormControl>
            <CategorySelect
              value={field.value}
              onChange={field.onChange}
              getMostFrequentlyUsed={getMostFrequentlyUsedCallback}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
