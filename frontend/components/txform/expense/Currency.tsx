import {useSharingType} from '@/components/txform/expense/useSharingType';
import {FieldLabel} from '@/components/txform/shared/FieldLabel';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {Select} from '@/components/ui/html-select';
import {allCurrencies} from '@/lib/model/Currency';
import {useFormContext} from 'react-hook-form';

export function Currency() {
  const {control} = useFormContext<TransactionFormSchema>();
  const {paidSelf} = useSharingType();
  if (paidSelf) {
    return null;
  }
  return (
    <FormField
      control={control}
      name="expense.currency"
      render={({field}) => (
        <FormItem className="col-span-2 space-y-1.5">
          <FieldLabel>Currency</FieldLabel>
          <FormControl>
            <Select
              className="h-11 rounded-md px-3.5 text-base"
              {...field}
              value={field.value ?? undefined}
            >
              {allCurrencies().map(({code}) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
