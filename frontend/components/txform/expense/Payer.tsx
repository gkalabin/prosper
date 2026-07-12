import {useSharingType} from '@/components/txform/expense/useSharingType';
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
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Payer() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {paidOther} = useSharingType();
  const payers = useUniqueFrequentPayers();
  if (!paidOther) {
    return null;
  }
  return (
    <FormField
      control={control}
      name="expense.payer"
      render={({field}) => (
        <FormItem className="col-span-4 space-y-1.5">
          <FieldLabel>Paid by</FieldLabel>
          <FormControl>
            <Input
              type="text"
              placeholder="Who paid?"
              className="h-11 rounded-md px-3.5 text-base"
              datalist={payers}
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

function payerOrNull(t: Transaction) {
  return t.kind == 'ThirdPartyExpense' ? t.payer : null;
}

function useUniqueFrequentPayers(): string[] {
  const {transactions} = useTransactionDataContext();
  return useMemo(
    () => uniqMostFrequentIgnoringEmpty(transactions.map(payerOrNull)),
    [transactions]
  );
}
