import {FieldLabel} from '@/components/txform/shared/FieldLabel';
import {SubFormValues} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {Select} from '@/components/ui/html-select';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useDisplayBankAccounts} from '@/lib/model/AppDataModel';
import {Bank, BankAccount, groupAccountsByBank} from '@/lib/model/BankAccount';
import * as React from 'react';
import {useFormContext} from 'react-hook-form';

// Bank account dropdown with the options grouped by bank. Rendered bare by
// the transfer form's from/to pair and wrapped into a labelled field by
// Account below.
export const AccountSelect = React.forwardRef<
  HTMLSelectElement,
  Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'value' | 'onChange' | 'children'
  > & {
    value: number | null | undefined;
    onChange: (accountId: number) => void;
  }
>(({value, onChange, ...props}, ref) => {
  const displayAccounts = useDisplayBankAccounts();
  const {banks, bankAccounts: allAccounts} = useCoreDataContext();
  return (
    <Select
      ref={ref}
      {...props}
      value={value?.toString()}
      onChange={e => onChange(parseInt(e.target.value, 10))}
    >
      {accountGroups({
        displayAccounts,
        allAccounts,
        accountId: value ?? null,
        banks,
      }).map(group => (
        <optgroup key={group.bank.id} label={group.bank.name}>
          {group.accounts.map(x => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
});
AccountSelect.displayName = 'AccountSelect';

export function Account({
  fieldName,
  label,
}: {
  fieldName:
    | 'income.accountId'
    | 'expense.accountId'
    | 'transfer.fromAccountId'
    | 'transfer.toAccountId';
  label: string;
}) {
  const {control} = useFormContext<SubFormValues>();
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({field}) => {
        return (
          <FormItem className="col-span-6 space-y-1.5">
            <FieldLabel>{label}</FieldLabel>
            <FormControl>
              <AccountSelect
                {...field}
                className="h-11 rounded-md px-3.5 text-base"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

// Groups the accounts to display by their bank, preserving account order within
// each bank.
function accountGroups({
  displayAccounts,
  allAccounts,
  accountId,
  banks,
}: {
  displayAccounts: BankAccount[];
  allAccounts: BankAccount[];
  accountId: number | null;
  banks: Bank[];
}): {bank: Bank; accounts: BankAccount[]}[] {
  // Include the currently selected account even if it's not in displayAccounts.
  const selected = allAccounts.find(x => x.id == accountId);
  const accounts =
    selected && !displayAccounts.some(x => x.id == accountId)
      ? [selected, ...displayAccounts]
      : displayAccounts;
  return groupAccountsByBank(accounts, banks);
}
