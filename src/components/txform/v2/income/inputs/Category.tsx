import {CategorySelect} from '@/components/txform/v2/shared/CategorySelect';
import {
  isRecent,
  matchesPayer,
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
import {isIncome} from '@/lib/model/transaction/Transaction';
import {useFormContext} from 'react-hook-form';

export function Category() {
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  const payer = getValues('income.payer') ?? '';
  const mostFrequentlyUsedCategoryIds = useTopCategoryIds({
    filters: [isIncome, matchesPayer(payer), isRecent],
    want: 5,
  });
  return (
    <FormField
      control={control}
      name="income.categoryId"
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
