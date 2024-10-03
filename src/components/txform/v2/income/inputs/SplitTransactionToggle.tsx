import {mostFrequentCompanion} from '@/components/txform/v2/prefill';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Switch} from '@/components/ui/switch';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function SplitTransactionToggle() {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const mostFrequentCompanion = useMostFrequentCompanion();
  return (
    <FormField
      control={control}
      name={'income.isShared'}
      render={({field, formState}) => (
        <FormItem className="col-span-3 flex flex-row items-center">
          <FormControl className="w-11">
            <Switch
              checked={field.value}
              disabled={formState.isSubmitting}
              onCheckedChange={shared => {
                field.onChange(shared);
                if (shared) {
                  // Prefill the companion field with the most frequent value.
                  setValue('income.companion', mostFrequentCompanion);
                }
              }}
            />
          </FormControl>
          <FormLabel className="ml-4">Split transaction</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function useMostFrequentCompanion() {
  const {transactions} = useAllDatabaseDataContext();
  return useMemo(
    () => mostFrequentCompanion(transactions) ?? '',
    [transactions]
  );
}
