import {Input} from '@/components/forms/Input';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {Controller, useFormContext} from 'react-hook-form';

import {format} from 'date-fns';

function toDateTimeLocal(d: Date | number) {
  // 2022-12-19T18:05:59
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function Timestamp({
  fieldName,
}: {
  fieldName: 'expense.timestamp' | 'expense.repayment.timestamp';
}) {
  const {
    control,
    setValue,
    formState: {isSubmitting},
  } = useFormContext<TransactionFormSchema>();
  return (
    <div className="col-span-6">
      <label
        htmlFor="timestamp"
        className="block text-sm font-medium text-gray-700"
      >
        Time
      </label>
      <Controller
        name={fieldName}
        control={control}
        render={({field}) => (
          <Input
            type="datetime-local"
            className="block w-full"
            disabled={isSubmitting}
            {...field}
            value={toDateTimeLocal(field.value)}
            onChange={e => {
              const dateTimeLocalValue = e.target.value;
              const d = new Date(dateTimeLocalValue);
              setValue(fieldName, d);
            }}
          />
        )}
      />
    </div>
  );
}
