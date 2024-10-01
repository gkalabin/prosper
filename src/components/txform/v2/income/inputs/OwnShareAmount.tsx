import {MoneyInput} from '@/components/txform/v2/shared/MoneyInput';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {centsToDollar, dollarToCents} from '@/lib/util/util';
import {useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function OwnShareAmount() {
  const {control, watch, setValue} = useFormContext<TransactionFormSchema>();
  const isShared = watch('income.isShared');
  const amount = useWatch({control, name: 'income.amount', exact: true});
  useEffect(() => {
    // Do not pass down NaN from amount to ownShare.
    const safeAmount = isNaN(amount) ? 0 : amount;
    if (!isShared) {
      setValue('income.ownShareAmount', safeAmount);
    } else {
      setValue(
        'income.ownShareAmount',
        // Converting to cents and back to dollars to avoid fractional cents, for example when splitting 1.11.
        centsToDollar(dollarToCents(safeAmount) / 2)
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
            <MoneyInput {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
