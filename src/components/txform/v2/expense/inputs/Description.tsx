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
import {useId, useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Description() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  const listId = useId();
  const descriptions = useMemo(
    () => uniqMostFrequentIgnoringEmpty(transactions.map(x => x.note)),
    [transactions]
  );
  return (
    <FormField
      control={control}
      name="expense.description"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Description</FormLabel>
          <FormControl>
            <Input
              type="text"
              list={listId}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
          <datalist id={listId}>
            {descriptions.map(v => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </FormItem>
      )}
    />
  );
}
