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
  const payers = useUniqueFrequentPayers();
  return (
    <FormField
      control={control}
      name="income.payer"
      render={({field}) => (
        <FormItem className="col-span-6 space-y-1.5">
          <FieldLabel>Source</FieldLabel>
          <FormControl>
            <Input
              type="text"
              placeholder="Who paid you?"
              className="h-11 rounded-md px-3.5 text-base"
              datalist={payers}
              {...field}
              onFocus={e => e.target.select()}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function payerOrNull(t: Transaction) {
  return t.kind == 'Income' ? t.payer : null;
}

function useUniqueFrequentPayers(): string[] {
  const {transactions} = useTransactionDataContext();
  return useMemo(
    () => uniqMostFrequentIgnoringEmpty(transactions.map(payerOrNull)),
    [transactions]
  );
}
