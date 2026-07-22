import {useExpenseCurrencyCode} from '@/components/txform/expense/useExpenseCurrency';
import {useSharingType} from '@/components/txform/expense/useSharingType';
import {MoneyField} from '@/components/txform/shared/MoneyField';
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

// OwnShareAmount is the part of a shared expense that is actually mine. Its
// label states the current claim: my share (I paid), what I owe, or what I've
// repaid.
export function OwnShareAmount() {
  const {control} = useFormContext<TransactionFormSchema>();
  const currencyCode = useExpenseCurrencyCode();
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
            <MoneyField currencyCode={currencyCode} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function LabelText() {
  const {getValues} = useFormContext<TransactionFormSchema>();
  const payer = getValues('expense.payer') || 'them';
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
