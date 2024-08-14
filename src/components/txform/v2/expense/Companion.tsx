import {Input} from '@/components/forms/Input';
import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {uniqMostFrequentIgnoringEmpty} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {otherPartyNameOrNull} from '@/lib/model/transaction/Transaction';
import {useId, useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Companion() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {isShared, paidSelf} = useSharingType();
  const companions = useUniqueCompanions();
  const listId = useId();
  if (!isShared) {
    return <></>;
  }
  if (!paidSelf) {
    return <div className="col-span-3"></div>;
  }
  return (
    <FormField
      control={control}
      name="expense.companion"
      render={({field}) => (
        <FormItem className="col-span-3">
          <FormLabel>Shared with</FormLabel>
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
            {companions.map(v => (
              <option key={v} value={v} />
            ))}
          </datalist>
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
