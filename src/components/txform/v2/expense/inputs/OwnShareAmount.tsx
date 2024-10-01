import {RepaymentToggle} from '@/components/txform/v2/expense/inputs/RepaymentToggle';
import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
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
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const {isShared} = useSharingType();
  const amount = useWatch({control, name: 'expense.amount', exact: true});
  useEffect(() => {
    // Do not pass down NaN from amount to ownShare.
    const safeAmount = isNaN(amount) ? 0 : amount;
    if (!isShared) {
      setValue('expense.ownShareAmount', safeAmount);
    } else {
      setValue(
        'expense.ownShareAmount',
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
      name="expense.ownShareAmount"
      render={({field}) => (
        <FormItem className="col-span-3">
          <FormLabel>
            <LabelText />
          </FormLabel>
          <FormControl>
            <MoneyInput {...field} />
          </FormControl>
          <FormMessage />
          <RepaymentToggle />
        </FormItem>
      )}
    />
  );
}

function LabelText() {
  const {getValues} = useFormContext<TransactionFormSchema>();
  const payer = getValues('expense.payer') || 'them';
  const {sharingType} = useSharingType();
  if (sharingType == 'PAID_SELF_SHARED') {
    return <>My share</>;
  }
  if (sharingType == 'PAID_OTHER_OWED') {
    return <>I owe {payer}</>;
  }
  if (sharingType == 'PAID_OTHER_REPAID') {
    return <>I paid {payer}</>;
  }
  throw new Error(`Unknown sharing type: ${sharingType}`);
}
