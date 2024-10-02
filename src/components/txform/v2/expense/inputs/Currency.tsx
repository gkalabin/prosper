import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
        <FormItem className="col-span-6">
          <FormLabel>Currency</FormLabel>
          <FormControl>
            <Select {...field} value={field.value ?? undefined}>
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
