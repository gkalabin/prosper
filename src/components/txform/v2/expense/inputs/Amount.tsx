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

// TODO: write tests
export function parseTextInputAsNumber(v: string): number | string {
  const normalised = v.replace(/,/g, '.');
  const match = normalised.match(/^[0-9]+(\.[0-9]+)?$/);
  if (!match) {
    return v;
  }
  return +normalised;
}
