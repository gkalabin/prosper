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
  const {formState, setValue, watch, control} =
    useFormContext<TransactionFormSchema>();
  const share = watch('expense.shareType');
  const paidSelf =
    'PAID_SELF_SHARED' == share || 'PAID_SELF_NOT_SHARED' == share;
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
              onClick={() => setValue('expense.shareType', 'PAID_OTHER_OWED')}
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
