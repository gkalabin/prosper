import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {Button} from '@/components/ui/button';
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

export function AccountFrom() {
  const {formState, setValue, control} =
    useFormContext<TransactionFormSchema>();
  const {paidSelf} = useSharingType();
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
  if (!paidSelf) {
    return <></>;
  }
  return (
    <FormField
      control={control}
      name="expense.accountId"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>I paid from</FormLabel>
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
          <div className="text-xs">
            or{' '}
            <Button
              type="button"
              onClick={() => setValue('expense.sharingType', 'PAID_OTHER_OWED')}
              variant="link"
              size="inherit"
              disabled={formState.isSubmitting}
            >
              someone else paid for this expense
            </Button>
            .
          </div>
        </FormItem>
      )}
    />
  );
}
