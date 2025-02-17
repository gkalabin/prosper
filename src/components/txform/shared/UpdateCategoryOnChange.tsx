import {
  topCategoriesMatchAll,
  TransactionFilterFn,
} from '@/components/txform/shared/useTopCategoryIds';
import {TransactionFormSchema} from '@/components/txform/types';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
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
  const {transactions} = useTransactionDataContext();
  useEffect(() => {
    const [mostFrequent] = topCategoriesMatchAll({
      transactions,
      filters,
      want: 1,
    });
    if (mostFrequent) {
      // Update the category all the time, even when user touched the field. The reasoning is the following:
      //  - User fills in the form top to bottom, the vendor input is before category.
      //    The amount of category edits followed by vendor edits is expected to be small and is ignored.
      //  - After the form is submitted, the process repeats. The user is expected to fill in the vendor first.
      setValue(fieldName, mostFrequent);
    }
  }, [fieldName, setValue, filters, transactions]);
  return null;
}
