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
        <FormItem className={cn(isShared ? 'col-span-3' : 'col-span-6')}>
          <FormLabel>Amount</FormLabel>
          <FormControl>
            <MoneyInput {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
