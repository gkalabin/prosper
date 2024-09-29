import {parseTextInputAsNumber} from '@/components/txform/v2/expense/inputs/Amount';
import {useAccountUnitsEqual} from '@/components/txform/v2/transfer/inputs/Amount';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function AmountReceived() {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const sameUnit = useAccountUnitsEqual();
  const amountSent = useWatch({
    control,
    name: 'transfer.amountSent',
    exact: true,
  });
  useEffect(() => {
    if (sameUnit) {
      setValue('transfer.amountReceived', amountSent);
    }
  }, [setValue, sameUnit, amountSent]);
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
            <Input
              type="text"
              inputMode="decimal"
              {...field}
              onChange={e =>
                field.onChange(parseTextInputAsNumber(e.target.value))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
