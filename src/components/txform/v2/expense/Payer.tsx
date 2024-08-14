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
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {otherPartyNameOrNull} from '@/lib/model/transaction/Transaction';
import {notEmpty} from '@/lib/util/util';
import {useId, useMemo} from 'react';
import {useFormContext} from 'react-hook-form';

export function Payer() {
  const {setValue, control, formState} =
    useFormContext<TransactionFormSchema>();
  const {paidOther} = useSharingType();
  const {transactions} = useAllDatabaseDataContext();
  const payers = useMemo(() => {
    return uniqMostFrequent(
      transactions.map(x => otherPartyNameOrNull(x)).filter(notEmpty)
    );
  }, [transactions]);
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
