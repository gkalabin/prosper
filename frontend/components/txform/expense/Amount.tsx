import {useSharingType} from '@/components/txform/expense/useSharingType';
import {FieldLabel} from '@/components/txform/shared/FieldLabel';
import {MoneyInput} from '@/components/txform/shared/MoneyInput';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {cn} from '@/lib/utils';
import {useFormContext} from 'react-hook-form';

export function Amount() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {isShared} = useSharingType();
  return (
    <FormField
      control={control}
      name="expense.amount"
      render={({field}) => (
        <FormItem
          className={cn('space-y-1.5', isShared ? 'col-span-3' : 'col-span-6')}
        >
          <FieldLabel>Amount</FieldLabel>
          <FormControl>
            <MoneyInput {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
