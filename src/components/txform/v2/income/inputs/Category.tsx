import {CategorySelect} from '@/components/txform/v2/shared/CategorySelect';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Transaction, isIncome} from '@/lib/model/transaction/Transaction';
import {useCallback} from 'react';
import {useFormContext} from 'react-hook-form';

export function Category() {
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  const payer = getValues('income.payer') ?? '';
  const matchesVendorIfAny = useCallback(
    (t: Transaction) => !payer || (isIncome(t) && t.payer == payer),
    [payer]
  );
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
              relevantTransactionFilter={matchesVendorIfAny}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
