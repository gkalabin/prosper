import {CategorySelect} from '@/components/txform/shared/CategorySelect';
import {
  TransactionFilterFn,
  useTopCategoriesMatchMost,
} from '@/components/txform/shared/useTopCategoryIds';
import {TransactionFormSchema} from '@/components/txform/types';
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
  const {control, formState} = useFormContext<TransactionFormSchema>();
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
              disabled={formState.isSubmitting}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
