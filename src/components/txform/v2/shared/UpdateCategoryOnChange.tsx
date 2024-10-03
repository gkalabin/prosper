import {TransactionFilterFn} from '@/components/txform/v2/shared/useTopCategoryIds';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useEffect} from 'react';
import {useFormContext} from 'react-hook-form';

// This component renders nothing, just adds a side effect.
// It is not a custom hook because for some reason changes to vendor are triggering re-render of the whole Category input and rendering CategorySelect is expensive.
export function UpdateCategoryOnChange({
  fieldName,
  filters,
}: {
  fieldName: 'expense.categoryId' | 'income.categoryId';
  filters: TransactionFilterFn[];
}) {
  const {setValue} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  useEffect(() => {
    const filtered = transactions.filter(t => filters.every(f => f(t)));
    const [mostFrequent] = uniqMostFrequent(filtered.map(t => t.categoryId));
    if (mostFrequent) {
      // Update the category all the time, even when user touched the field. The reasoning is the following:
      //  - User fills in the form top to bottom, the vendor input is before category.
      //    The amount of category edits followed by vendor edits is expected to be small and is ignored.
      //  - After the form is submitted, the process repeats. The user is expected to fill in the vendor first.
      setValue(fieldName, mostFrequent);
    }
  }, [setValue, filters, transactions]);
  return null;
}
