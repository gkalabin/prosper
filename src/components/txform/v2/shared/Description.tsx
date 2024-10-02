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
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Description({
  fieldName,
}: {
  fieldName:
    | 'expense.description'
    | 'income.description'
    | 'transfer.description';
}) {
  const {control} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  const descriptions = useMemo(
    () => uniqMostFrequentIgnoringEmpty(transactions.map(x => x.note)),
    [transactions]
  );
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Description</FormLabel>
          <FormControl>
            <Input
              type="text"
              datalist={descriptions}
              {...field}
              value={field.value ?? ''}
              onFocus={e => e.target.select()}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
