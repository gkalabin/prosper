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
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

// Payer is the "who paid" field shown inside the someone-else-paid reveal.
export function Payer() {
  const {control} = useFormContext<TransactionFormSchema>();
  const payers = useUniqueFrequentPayers();
  return (
    <FormField
      control={control}
      name="expense.payer"
      render={({field}) => (
        <FormItem>
          <FormLabel>Who paid</FormLabel>
          <FormControl>
            <Input
              type="text"
              datalist={payers}
              placeholder="Name"
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
