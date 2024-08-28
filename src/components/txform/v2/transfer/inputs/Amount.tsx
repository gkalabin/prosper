import {parseTextInputAsNumber} from '@/components/txform/v2/expense/inputs/Amount';
import {TransactionFormSchema} from '@/components/txform/v2/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {accountUnitsEqual, mustFindBankAccount} from '@/lib/model/BankAccount';
import {cn} from '@/lib/utils';
import {useFormContext} from 'react-hook-form';

export function Amount() {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  const sameUnit = useAccountUnitsEqual();
  return (
    <FormField
      control={control}
      name="transfer.amountSent"
      render={({field}) => (
        <FormItem className={cn(sameUnit ? 'col-span-6' : 'col-span-3')}>
          <FormLabel>{sameUnit ? 'Amount' : 'Amount Sent'}</FormLabel>
          <FormControl>
            <Input
              type="text"
              inputMode="decimal"
              {...field}
              onChange={e => {
                field.onChange(parseTextInputAsNumber(e.target.value));
                if (sameUnit) {
                  setValue('transfer.amountReceived', field.value);
                }
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function useAccountUnitsEqual() {
  const {watch} = useFormContext<TransactionFormSchema>();
  const {bankAccounts} = useAllDatabaseDataContext();
  const fromAccount = mustFindBankAccount(
    bankAccounts,
    watch('transfer.fromAccountId')
  );
  const toAccount = mustFindBankAccount(
    bankAccounts,
    watch('transfer.toAccountId')
  );
  return accountUnitsEqual(fromAccount, toAccount);
}
