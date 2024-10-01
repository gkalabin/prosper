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
import {appendNewItems} from '@/lib/util/util';
import {useCallback, useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function Category() {
  const {transactions} = useAllDatabaseDataContext();
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  const vendor = getValues('expense.vendor');
  const getMostFrequentlyUsedCallback = useCallback(
    () => getMostFrequentlyUsed({vendor, transactions}),
    [vendor, transactions]
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
              getMostFrequentlyUsed={getMostFrequentlyUsedCallback}
            />
          </FormControl>
          <FormMessage />
          <UpdateCategoryOnVendorChange />
        </FormItem>
      )}
    />
  );
}

// This component renders nothing, just adds a side effect.
// It is not a custom hook because for some reason changes to vendor are triggering re-render of the whole Category input and rendering CategorySelect is expensive.
function UpdateCategoryOnVendorChange() {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  const vendor = useWatch({control, name: 'expense.vendor', exact: true});
  useEffect(() => {
    const [mostFrequent] = getMostFrequentlyUsed({vendor, transactions});
    if (mostFrequent) {
      // Update the category all the time, even when user touched the field. The reasoning is the following:
      //  - User fills in the form top to bottom, the vendor input is before category.
      //    The amount of category edits followed by vendor edits is expected to be small and is ignored.
      //  - After the form is submitted, the process repeats. The user is expected to fill in the vendor first.
      setValue('expense.categoryId', mostFrequent);
    }
  }, [setValue, vendor, transactions]);
  return null;
}

export function getMostFrequentlyUsed({
  vendor,
  transactions,
}: {
  vendor: string;
  transactions: Transaction[];
}): number[] {
  const expenses = transactions.filter(isExpense);
  const matchesVendor = (s: string) =>
    !vendor || vendor.trim().toLowerCase() == s.trim().toLowerCase();
  const mostRelevant = uniqMostFrequent(
    expenses.filter(t => matchesVendor(t.vendor)).map(t => t.categoryId)
  );
  return appendNewItems(
    mostRelevant,
    uniqMostFrequent(expenses.map(t => t.categoryId))
  );
}
