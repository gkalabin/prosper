import {useIncomeCurrencyCode} from '@/components/txform/income/Amount';
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

export function OwnShareAmount() {
  const {control} = useFormContext<TransactionFormSchema>();
  const currencyCode = useIncomeCurrencyCode();
  return (
    <FormField
      control={control}
      name="income.ownShareAmount"
      render={({field}) => (
        <FormItem>
          <FormLabel>My share</FormLabel>
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
