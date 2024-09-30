import {CategorySelect} from '@/components/txform/v2/shared/CategorySelect';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {Transaction, isIncome} from '@/lib/model/transaction/Transaction';
import {appendNewItems} from '@/lib/util/util';
import {useCallback, useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function Category() {
  const {transactions} = useAllDatabaseDataContext();
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  const payer = getValues('income.payer') ?? '';
  const getMostFrequentlyUsedCallback = useCallback(
    () => getMostFrequentlyUsed({payer, transactions}),
    [payer, transactions]
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
              getMostFrequentlyUsed={getMostFrequentlyUsedCallback}
            />
          </FormControl>
          <FormMessage />
          <UpdateCategoryOnPayerChange />
        </FormItem>
      )}
    />
  );
}

function UpdateCategoryOnPayerChange() {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const {transactions} = useAllDatabaseDataContext();
  const payer = useWatch({control, name: 'income.payer', exact: true});
  useEffect(() => {
    const [mostFrequent] = getMostFrequentlyUsed({payer, transactions});
    if (mostFrequent) {
      setValue('income.categoryId', mostFrequent);
    }
  }, [setValue, payer, transactions]);
  return null;
}

function getMostFrequentlyUsed({
  payer,
  transactions,
}: {
  payer: string;
  transactions: Transaction[];
}): number[] {
  const income = transactions.filter(isIncome);
  const matchesPayer = (s: string) =>
    !payer || payer.trim().toLowerCase() == s.trim().toLowerCase();
  const mostRelevant = uniqMostFrequent(
    income.filter(t => matchesPayer(t.payer)).map(t => t.categoryId)
  );
  return appendNewItems(
    mostRelevant,
    uniqMostFrequent(income.map(t => t.categoryId))
  );
}
