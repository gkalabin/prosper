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
import {isOpeningBalance} from '@/lib/model/transaction/Transaction';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Description({
  fieldName,
  label,
  placeholder,
}: {
  fieldName:
    | 'expense.description'
    | 'income.description'
    | 'transfer.description';
  label: string;
  placeholder?: string;
}) {
  const {control} = useFormContext<TransactionFormSchema>();
  const {transactions} = useTransactionDataContext();
  const descriptions = useMemo(
    () =>
      uniqMostFrequentIgnoringEmpty(
        // Filter out opening balance transactions as they have no note.
        transactions.filter(x => !isOpeningBalance(x)).map(x => x.note)
      ),
    [transactions]
  );
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({field}) => (
        <FormItem className="col-span-6 space-y-1.5">
          <FieldLabel>{label}</FieldLabel>
          <FormControl>
            <Input
              type="text"
              placeholder={placeholder}
              className="h-11 rounded-md px-3.5 text-base"
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
