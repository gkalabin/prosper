import {MoneyInput} from '@/components/txform/shared/MoneyInput';
import {useAccountCurrency} from '@/components/txform/shared/useAccountCurrency';
import {SubFormValues} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {accountUnitsEqual, mustFindBankAccount} from '@/lib/model/BankAccount';
import {useFormContext, useWatch} from 'react-hook-form';

export function Amount() {
  const {control} = useFormContext<SubFormValues>();
  const sameUnit = useAccountUnitsEqual();
  const accountId = useWatch({name: 'transfer.fromAccountId', exact: true});
  const currency = useAccountCurrency(accountId);
  return (
    <FormField
      control={control}
      name="transfer.amountSent"
      render={({field}) => (
        <FormItem>
          <FormLabel>{sameUnit ? 'Amount' : 'Sent'}</FormLabel>
          <FormControl>
            <MoneyInput currency={currency} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function useAccountUnitsEqual() {
  const {watch} = useFormContext<SubFormValues>();
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
