import {MoneyField} from '@/components/txform/shared/MoneyField';
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
  const currencyCode = useTransferAccountCurrencyCode('transfer.fromAccountId');
  return (
    <FormField
      control={control}
      name="transfer.amountSent"
      render={({field}) => (
        <FormItem>
          <FormLabel>{sameUnit ? 'Amount' : 'Sent'}</FormLabel>
          <FormControl>
            <MoneyField
              currencyCode={currencyCode}
              placeholder="0.00"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function useTransferAccountCurrencyCode(
  fieldName: 'transfer.fromAccountId' | 'transfer.toAccountId'
): string | undefined {
  const {bankAccounts} = useCoreDataContext();
  const accountId = useWatch({name: fieldName, exact: true});
  return bankAccounts.find(a => a.id === accountId)?.currencyCode ?? undefined;
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
