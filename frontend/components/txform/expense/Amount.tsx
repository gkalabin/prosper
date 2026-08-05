import {useExpenseCurrency} from '@/components/txform/expense/useExpenseCurrency';
import {MoneyInput} from '@/components/txform/shared/MoneyInput';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {useFormContext} from 'react-hook-form';

export function Amount() {
  const {control} = useFormContext<TransactionFormSchema>();
  const currency = useExpenseCurrency();
  return (
    <FormField
      control={control}
      name="expense.amount"
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
