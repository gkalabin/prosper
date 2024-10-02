import {MoneyInput} from '@/components/txform/v2/shared/MoneyInput';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {useFormContext} from 'react-hook-form';

export function OwnShareAmount() {
  const {control, watch} = useFormContext<TransactionFormSchema>();
  const isShared = watch('income.isShared');
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
