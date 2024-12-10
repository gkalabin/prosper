import {MoneyInput} from '@/components/txform/shared/MoneyInput';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {cn} from '@/lib/utils';
import {useFormContext, useWatch} from 'react-hook-form';

export function Amount() {
  const {control, watch} = useFormContext<TransactionFormSchema>();
  const isShared = watch('income.isShared');
  return (
    <FormField
      control={control}
      name="income.amount"
      render={({field}) => (
        <FormItem className={cn(isShared ? 'col-span-3' : 'col-span-6')}>
          <FormLabel>Amount</FormLabel>
          <FormControl>
            <MoneyInput {...field} />
          </FormControl>
          <FormMessage />
          <NewBalanceNoteWrapper />
        </FormItem>
      )}
    />
  );
}

function NewBalanceNoteWrapper() {
  const amount = useWatch({name: 'income.amount', exact: true});
  const accountId = useWatch({name: 'income.accountId', exact: true});
  return <NewBalanceNote amount={amount} accountId={accountId} />;
}
