import {CategorySelect} from '@/components/txform/v2/shared/CategorySelect';
import {
  TransactionFilterFn,
  useTopCategoriesMatchMost,
} from '@/components/txform/v2/shared/useTopCategoryIds';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {useFormContext} from 'react-hook-form';

export function Category({
  fieldName,
  filters,
}: {
  fieldName: 'expense.categoryId' | 'income.categoryId' | 'transfer.categoryId';
  filters: TransactionFilterFn[];
}) {
  const {control} = useFormContext<TransactionFormSchema>();
  const mostFrequentlyUsedCategoryIds = useTopCategoriesMatchMost({
    filters,
    want: 5,
  });
  return (
    <FormField
      control={control}
      name={fieldName}
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
