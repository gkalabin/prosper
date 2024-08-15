import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Select} from '@/components/ui/html-select';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayBankAccounts} from '@/lib/model/AllDatabaseDataModel';
import {fullAccountName} from '@/lib/model/BankAccount';
import {useFormContext} from 'react-hook-form';

export function AccountTo() {
  const {control} = useFormContext<TransactionFormSchema>();
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
  return (
    <FormField
      control={control}
      name="income.accountId"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Money received to</FormLabel>
          <FormControl>
            <Select
              {...field}
              value={field.value?.toString()}
              onChange={e => field.onChange(parseInt(e.target.value, 10))}
            >
              {accounts.map(x => (
                <option key={x.id} value={x.id}>
                  {fullAccountName(x, banks)}
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
