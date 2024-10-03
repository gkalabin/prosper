import {
  findTopCategoryIds,
  isRecent,
  matchesVendor,
} from '@/components/txform/v2/shared/useTopCategoryIds';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {isExpense} from '@/lib/model/transaction/Transaction';
import {useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

// This component renders nothing, just adds a side effect.
// It is not a custom hook because for some reason changes to vendor are triggering re-render of the whole Category
// input and rendering CategorySelect is expensive.
export function UpdateCategoryOnVendorChange() {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  const vendor = useWatch({control, name: 'expense.vendor', exact: true});
  useEffect(() => {
    const [mostFrequent] = findTopCategoryIds({
      transactions,
      filters: [isExpense, matchesVendor(vendor), isRecent],
      want: 1,
    });
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
