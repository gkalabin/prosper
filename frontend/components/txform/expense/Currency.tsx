import {TransactionFormSchema} from '@/components/txform/types';
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

// Currency is the currency of an expense someone else paid — the app can't
// infer it from an account since no account of ours is involved.
export function Currency() {
  const {control} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name="expense.currency"
      render={({field}) => (
        <FormItem>
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
