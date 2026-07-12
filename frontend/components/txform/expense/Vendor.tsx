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
import {
  isExpense,
  isIncome,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Vendor() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {transactions} = useTransactionDataContext();
  const vendors = useMemo(
    () => uniqMostFrequentIgnoringEmpty(transactions.map(vendorOrNull)),
    [transactions]
  );
  return (
    <FormField
      control={control}
      name="expense.vendor"
      render={({field}) => (
        <FormItem className="col-span-6 space-y-1.5">
          <FieldLabel>Vendor</FieldLabel>
          <FormControl>
            <Input
              type="text"
              placeholder="Where did you spend?"
              className="h-11 rounded-md px-3.5 text-base"
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
