import {useExpenseCurrency} from '@/components/txform/expense/useExpenseCurrency';
import {useSharingType} from '@/components/txform/expense/useSharingType';
import {usePayerName} from '@/components/txform/expense/usePayerName';
import {MoneyInput} from '@/components/txform/shared/MoneyInput';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {useFormContext} from 'react-hook-form';

export function OwnShareAmount() {
  const {control} = useFormContext<TransactionFormSchema>();
  const currency = useExpenseCurrency();
  return (
    <FormField
      control={control}
      name="expense.ownShareAmount"
      render={({field}) => (
        <FormItem>
          <FormLabel>
            <LabelText />
          </FormLabel>
          <FormControl>
            <MoneyInput currency={currency} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function LabelText() {
  const payer = usePayerName() ?? 'them';
  const {sharingType} = useSharingType();
  if (sharingType == SharingType.PAID_SELF_SHARED) {
    return <>My share</>;
  }
  if (sharingType == SharingType.PAID_OTHER_OWED) {
    return <>I owe {payer}</>;
  }
  if (sharingType == SharingType.PAID_OTHER_REPAID) {
    return <>I paid {payer}</>;
  }
  throw new Error(`Unknown sharing type: ${sharingType}`);
}
