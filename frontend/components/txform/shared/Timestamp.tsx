import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {format, isValid} from 'date-fns';
import * as React from 'react';
import {useFormContext} from 'react-hook-form';

function toDateTimeLocal(d: Date | string | undefined) {
  if (d === undefined) {
    return '';
  }
  try {
    // 2022-12-19T18:05:59
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch (e) {
    // When using keyboard, one might type 20222 year which leads to an invalid date.
    // This is still set as value to avoid messing with the process of the user input,
    // and will be caught by refine method.
    // Return the invalid string here to keep the value the user has inputted.
    return d.toString();
  }
}

// Datetime input which keeps the form value a Date while the user is typing a
// valid one and falls back to the raw string so validation can reject it.
export const DateTimeInput = React.forwardRef<
  HTMLInputElement,
  Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange'
  > & {
    value: Date | string | undefined;
    onChange: (value: Date | string) => void;
  }
>(({value, onChange, ...props}, ref) => (
  <Input
    type="datetime-local"
    ref={ref}
    {...props}
    value={toDateTimeLocal(value)}
    onChange={e => {
      const dateTimeLocalValue = e.target.value;
      const d = new Date(dateTimeLocalValue);
      onChange(isValid(d) ? d : dateTimeLocalValue);
    }}
  />
));
DateTimeInput.displayName = 'DateTimeInput';

export function Timestamp({
  fieldName,
}: {
  fieldName: 'expense.timestamp' | 'income.timestamp' | 'transfer.timestamp';
}) {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({field}) => (
        <FormItem className="col-span-6">
          <div className="flex items-center gap-2.5">
            <FormLabel className="text-muted-foreground flex-none text-[13px] font-semibold">
              When
            </FormLabel>
            <FormControl className="flex-1">
              <DateTimeInput
                {...field}
                className="h-10 rounded-md px-3 tabular-nums"
                onChange={value => setValue(fieldName, value)}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
