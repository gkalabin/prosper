import {mostFrequentCompanion} from '@/components/txform/prefill';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Switch} from '@/components/ui/switch';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
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
  const {transactions} = useTransactionDataContext();
  return useMemo(
    () => mostFrequentCompanion(transactions) ?? '',
    [transactions]
  );
}
