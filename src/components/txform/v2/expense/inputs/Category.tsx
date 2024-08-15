import {CategorySelect} from '@/components/txform/v2/expense/inputs/CategorySelect';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Transaction, isExpense} from '@/lib/model/transaction/Transaction';
import {useCallback} from 'react';
import {useFormContext} from 'react-hook-form';

export function Category() {
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  const vendor = getValues('expense.vendor') ?? '';
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
        </FormItem>
      )}
    />
  );
}
