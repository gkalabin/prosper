import {CategorySelect} from '@/components/txform/v2/shared/CategorySelect';
import {
  isRecent,
  matchesVendor,
  useTopCategoryIds,
} from '@/components/txform/v2/shared/useTopCategoryIds';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {isExpense} from '@/lib/model/transaction/Transaction';
import {useFormContext, useWatch} from 'react-hook-form';

export function Category() {
  const {control} = useFormContext<TransactionFormSchema>();
  const vendor = useWatch({name: 'expense.vendor', exact: true});
  const mostFrequentlyUsedCategoryIds = useTopCategoryIds({
    filters: [isExpense, matchesVendor(vendor), isRecent],
    want: 5,
  });
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
              mostFrequentlyUsedCategoryIds={mostFrequentlyUsedCategoryIds}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
