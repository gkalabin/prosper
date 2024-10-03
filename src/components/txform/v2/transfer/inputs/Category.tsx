import {CategorySelect} from '@/components/txform/v2/shared/CategorySelect';
import {useTopCategoryIds} from '@/components/txform/v2/shared/useTopCategoryIds';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {isTransfer} from '@/lib/model/transaction/Transaction';
import {useFormContext} from 'react-hook-form';

export function Category() {
  const {control} = useFormContext<TransactionFormSchema>();
  const mostFrequentlyUsedCategoryIds = useTopCategoryIds({
    filters: [isTransfer],
    want: 5,
  });
  return (
    <FormField
      control={control}
      name="transfer.categoryId"
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
