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
import {
  isExpense,
  isIncome,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Vendor() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  const vendors = useMemo(
    () => uniqMostFrequentIgnoringEmpty(transactions.map(vendorOrNull)),
    [transactions]
  );
  return (
    <FormField
      control={control}
      name="expense.vendor"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Vendor</FormLabel>
          <FormControl>
            <Input
              type="text"
              datalist={vendors}
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

function vendorOrNull(x: Transaction): string | null {
  if (isExpense(x)) {
    return x.vendor;
  }
  if (isIncome(x)) {
    return x.payer;
  }
  return null;
}
