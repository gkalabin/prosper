import {MoneyInput} from '@/components/txform/shared/MoneyInput';
import {useAccountUnitsEqual} from '@/components/txform/transfer/Amount';
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
  if (sameUnit) {
    return null;
  }
  return (
    <FormField
      control={control}
      name="transfer.amountReceived"
      render={({field}) => (
        <FormItem className="col-span-3">
          <FormLabel>Amount Received</FormLabel>
          <FormControl>
            <MoneyInput {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
