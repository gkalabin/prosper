import {MoneyField} from '@/components/txform/shared/MoneyField';
import {
  useAccountUnitsEqual,
  useTransferAccountCurrencyCode,
} from '@/components/txform/transfer/Amount';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {useFormContext} from 'react-hook-form';

export function AmountReceived() {
  const {control} = useFormContext<TransactionFormSchema>();
  const sameUnit = useAccountUnitsEqual();
  const currencyCode = useTransferAccountCurrencyCode('transfer.toAccountId');
  if (sameUnit) {
    return null;
  }
  return (
    <FormField
      control={control}
      name="transfer.amountReceived"
      render={({field}) => (
        <FormItem>
          <FormLabel>Received</FormLabel>
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
