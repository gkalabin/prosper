import {MoneyInput} from '@/components/txform/shared/MoneyInput';
import {useAccountCurrency} from '@/components/txform/shared/useAccountCurrency';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {useFormContext, useWatch} from 'react-hook-form';

export function Amount() {
  const {control} = useFormContext<TransactionFormSchema>();
  const accountId = useWatch({name: 'income.accountId', exact: true});
  const currency = useAccountCurrency(accountId);
  return (
    <FormField
      control={control}
      name="income.amount"
      render={({field}) => (
        <FormItem>
          <FormLabel>Amount</FormLabel>
          <FormControl>
            <MoneyInput currency={currency} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
