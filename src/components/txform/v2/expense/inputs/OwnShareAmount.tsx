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
import {useFormContext} from 'react-hook-form';

export function OwnShareAmount() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {isShared} = useSharingType();
  if (!isShared) {
    return <></>;
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
    return <>My share (which I owe {payer})</>;
  }
  if (sharingType == 'PAID_OTHER_REPAID') {
    return <>My share (which I paid back)</>;
  }
  throw new Error(`Unknown sharing type: ${sharingType}`);
}
