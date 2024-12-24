import {MoneyInput} from '@/components/txform/shared/MoneyInput';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {accountUnitsEqual, mustFindBankAccount} from '@/lib/model/BankAccount';
import {cn} from '@/lib/utils';
import {useFormContext} from 'react-hook-form';

export function Amount() {
  const {control} = useFormContext<TransactionFormSchema>();
  const sameUnit = useAccountUnitsEqual();
  return (
    <FormField
      control={control}
      name="transfer.amountSent"
      render={({field}) => (
        <FormItem className={cn(sameUnit ? 'col-span-6' : 'col-span-3')}>
          <FormLabel>{sameUnit ? 'Amount' : 'Amount Sent'}</FormLabel>
          <FormControl>
            <MoneyInput {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function useAccountUnitsEqual() {
  const {watch} = useFormContext<TransactionFormSchema>();
  const {bankAccounts} = useCoreDataContext();
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
