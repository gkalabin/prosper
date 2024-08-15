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
import {cn} from '@/lib/utils';
import {useFormContext} from 'react-hook-form';

export function Amount() {
  const {control, watch} = useFormContext<TransactionFormSchema>();
  const isShared = watch('income.isShared');
  return (
    <FormField
      control={control}
      name="income.amount"
      render={({field}) => (
        <FormItem className={cn(isShared ? 'col-span-3' : 'col-span-6')}>
          <FormLabel>Amount</FormLabel>
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
