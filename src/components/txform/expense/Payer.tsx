import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {TransactionFormSchema} from '@/components/txform/types';
import {Button} from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {uniqMostFrequentIgnoringEmpty} from '@/lib/collections';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {transactionCompanionNameOrNull} from '@/lib/model/queries/TransactionMetadata';
import { Expense } from '@/lib/model/transactionNEW/Expense';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Payer() {
  const {control, formState} = useFormContext<TransactionFormSchema>();
  const {paidOther} = useSharingType();
  const payers = useUniqueFrequentPayers();
  const {setPaidSelf} = useSharingTypeActions();
  if (!paidOther) {
    return null;
  }
  return (
    <FormField
      control={control}
      name="expense.payer"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>This expense was paid by</FormLabel>
          <FormControl>
            <Input
              type="text"
              datalist={payers}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
          <div className="text-xs">
            or{' '}
            <Button
              type="button"
              onClick={setPaidSelf}
              variant="link"
              size="inherit"
              disabled={formState.isSubmitting}
            >
              I paid for this myself
            </Button>
            .
          </div>
        </FormItem>
      )}
    />
  );
}

function payerOrNull(t: Expense) {
  return t.kind == 'ThirdPartyExpense' ? t.payer : null;
}

function useUniqueFrequentPayers(): string[] {
  const {transactions} = useTransactionDataContext();
  const {accounts} = useCoreDataContext();
  const expenses = transactions.filter(t => t.kind === 'EXPENSE');
  return useMemo(
    () =>
      uniqMostFrequentIgnoringEmpty(
        expenses.map(t => transactionCompanionNameOrNull({t, accounts}))
      ),
    [expenses, accounts]
  );
}
