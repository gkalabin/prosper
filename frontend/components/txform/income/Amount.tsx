import {MoneyField} from '@/components/txform/shared/MoneyField';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useFormContext, useWatch} from 'react-hook-form';

export function Amount() {
  const {control} = useFormContext<TransactionFormSchema>();
  const currencyCode = useIncomeCurrencyCode();
  return (
    <FormField
      control={control}
      name="income.amount"
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

// useIncomeCurrencyCode returns the currency of the account the income was
// received into.
export function useIncomeCurrencyCode(): string | undefined {
  const {bankAccounts} = useCoreDataContext();
  const accountId = useWatch({name: 'income.accountId', exact: true});
  return bankAccounts.find(a => a.id === accountId)?.currencyCode ?? undefined;
}
