import {useExpenseCurrencyCode} from '@/components/txform/expense/useExpenseCurrency';
import {MoneyField} from '@/components/txform/shared/MoneyField';
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
  const currencyCode = useExpenseCurrencyCode();
  return (
    <FormField
      control={control}
      name="expense.amount"
      render={({field}) => (
        <FormItem>
          <FormLabel>Amount</FormLabel>
          <FormControl>
            <MoneyField
              currencyCode={currencyCode}
              placeholder="0.00"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
