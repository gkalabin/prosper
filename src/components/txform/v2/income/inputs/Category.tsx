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
import {useCallback, useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function Category() {
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  const payer = getValues('income.payer') ?? '';
  const matchesPayerIfAny = useCallback(
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
              relevantTransactionFilter={matchesPayerIfAny}
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
    const mostFrequent = mostFrequentCategoryId({payer, transactions});
    if (mostFrequent) {
      setValue('income.categoryId', mostFrequent);
    }
  }, [setValue, payer, transactions]);
  return null;
}

function mostFrequentCategoryId({
  payer,
  transactions,
}: {
  payer: string;
  transactions: Transaction[];
}): number | null {
  const matchesPayer = (s: string) =>
    payer.trim().toLowerCase() == s.trim().toLowerCase();

  const relevantTransactions = transactions.filter(
    t => isIncome(t) && matchesPayer(t.payer)
  );
  const [mostFrequentCategoryId] = uniqMostFrequent(
    relevantTransactions.map(t => t.categoryId)
  );
  return mostFrequentCategoryId || null;
}
