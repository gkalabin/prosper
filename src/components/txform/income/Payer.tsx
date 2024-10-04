import {TransactionFormSchema} from '@/components/txform/types';
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
        <FormItem className="col-span-6">
          <FormLabel>Payer</FormLabel>
          <FormControl>
            <Input
              type="text"
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
  const {transactions} = useAllDatabaseDataContext();
  return useMemo(
    () => uniqMostFrequentIgnoringEmpty(transactions.map(payerOrNull)),
    [transactions]
  );
}
