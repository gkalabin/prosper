import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
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
import {useId, useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Payer() {
  const {setValue, control, formState} =
    useFormContext<TransactionFormSchema>();
  const {paidOther} = useSharingType();
  const payers = useUniqueFrequentPayers();
  const payersListId = useId();
  if (!paidOther) {
    return <></>;
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
              list={payersListId}
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormMessage />
          <div className="text-xs">
            or{' '}
            <Button
              onClick={() =>
                setValue('expense.sharingType', 'PAID_SELF_NOT_SHARED')
              }
              variant="link"
              size="inherit"
              disabled={formState.isSubmitting}
            >
              I paid for this myself
            </Button>
            .
          </div>
          <datalist id={payersListId}>
            {payers.map(v => (
              <option key={v} value={v} />
            ))}
          </datalist>
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
