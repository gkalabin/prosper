import {CategorySelect} from '@/components/txform/v2/shared/CategorySelect';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {Transaction, isExpense} from '@/lib/model/transaction/Transaction';
import {useCallback, useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function Category() {
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  const vendor = getValues('expense.vendor');
  const matchesVendorIfAny = useCallback(
    (t: Transaction) => !vendor || (isExpense(t) && t.vendor == vendor),
    [vendor]
  );
  return (
    <FormField
      control={control}
      name="expense.categoryId"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Category</FormLabel>
          <FormControl>
            <CategorySelect
              value={field.value}
              onChange={field.onChange}
              relevantTransactionFilter={matchesVendorIfAny}
            />
          </FormControl>
          <FormMessage />
          <UpdateCategoryOnVendorChange />
        </FormItem>
      )}
    />
  );
}

function UpdateCategoryOnVendorChange() {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  const vendor = useWatch({control, name: 'expense.vendor', exact: true});
  useEffect(() => {
    const mostFrequent = mostFrequentCategoryId({vendor, transactions});
    if (mostFrequent) {
      setValue('expense.categoryId', mostFrequent);
    }
  }, [setValue, vendor, transactions]);
  return null;
}

function mostFrequentCategoryId({
  vendor,
  transactions,
}: {
  vendor: string;
  transactions: Transaction[];
}): number | null {
  const matchesVendor = (s: string) =>
    vendor.trim().toLowerCase() == s.trim().toLowerCase();

  const relevantExpenses = transactions.filter(
    t => isExpense(t) && matchesVendor(t.vendor)
  );
  const [mostFrequentCategoryId] = uniqMostFrequent(
    relevantExpenses.map(t => t.categoryId)
  );
  return mostFrequentCategoryId || null;
}
