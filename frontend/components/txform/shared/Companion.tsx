import {FieldLabel} from '@/components/txform/shared/FieldLabel';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
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
        <FormItem className="border-brand-soft col-span-6 space-y-1.5 border-l-2 pl-3">
          <FieldLabel>Split with</FieldLabel>
          <FormControl>
            <Input
              type="text"
              placeholder="Who are you splitting with?"
              className="h-11 rounded-md px-3.5 text-base"
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
