import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {format} from 'date-fns';
import {useFormContext} from 'react-hook-form';

function toDateTimeLocal(d: Date | number | undefined) {
  if (!d) {
    return '';
  }
  // 2022-12-19T18:05:59
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function Timestamp({
  fieldName,
}: {
  fieldName:
    | 'expense.timestamp'
    | 'expense.repayment.timestamp'
    | 'income.timestamp'
    | 'transfer.timestamp';
}) {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Time</FormLabel>
          <FormControl>
            <Input
              type="datetime-local"
              {...field}
              value={toDateTimeLocal(field.value)}
              onChange={e => {
                const dateTimeLocalValue = e.target.value;
                const d = new Date(dateTimeLocalValue);
                setValue(fieldName, d);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
