import {parseTextInputAsNumber} from '@/components/txform/v2/expense/inputs/Amount';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {centsToDollar, dollarToCents} from '@/lib/util/util';
import {useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function OwnShareAmount() {
  const {control, watch, setValue} = useFormContext<TransactionFormSchema>();
  const isShared = watch('income.isShared');
  const amount = useWatch({control, name: 'income.amount', exact: true});
  useEffect(() => {
    if (!isShared) {
      setValue('income.ownShareAmount', amount);
    } else {
      setValue(
        'income.ownShareAmount',
        // Converting to cents and back to dollars to avoid fractional cents, for example when splitting 1.11.
        centsToDollar(dollarToCents(amount) / 2)
      );
    }
  }, [setValue, isShared, amount]);
  if (!isShared) {
    return null;
  }
  return (
    <FormField
      control={control}
      name="income.ownShareAmount"
      render={({field}) => (
        <FormItem className="col-span-3">
          <FormLabel>My share</FormLabel>
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
