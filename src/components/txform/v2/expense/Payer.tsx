import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/v2/expense/useSharingTypeActions';
import {TransactionFormSchema} from '@/components/txform/v2/types';
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
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {Transaction} from '@/lib/model/transaction/Transaction';
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

function payerOrNull(t: Transaction) {
  return t.kind == 'ThirdPartyExpense' ? t.payer : null;
}

function useUniqueFrequentPayers(): string[] {
  const {transactions} = useAllDatabaseDataContext();
  return useMemo(
    () => uniqMostFrequentIgnoringEmpty(transactions.map(payerOrNull)),
    [transactions]
  );
}
