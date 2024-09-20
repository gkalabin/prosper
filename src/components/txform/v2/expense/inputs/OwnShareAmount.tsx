import {parseTextInputAsNumber} from '@/components/txform/v2/expense/inputs/Amount';
import {RepaymentToggle} from '@/components/txform/v2/expense/inputs/RepaymentToggle';
import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {centsToDollar} from '@/lib/util/util';
import {useEffect} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

export function OwnShareAmount() {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const {isShared} = useSharingType();
  const amount = useWatch({control, name: 'expense.amount', exact: true});
  useEffect(() => {
    if (!isShared) {
      setValue('expense.ownShareAmount', amount);
    } else {
      setValue('expense.ownShareAmount', centsToDollar((100 * amount) / 2));
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
