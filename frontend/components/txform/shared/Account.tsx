import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Select} from '@/components/ui/html-select';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useDisplayBankAccounts} from '@/lib/model/AppDataModel';
import {Bank, BankAccount, groupAccountsByBank} from '@/lib/model/BankAccount';
import {useFormContext} from 'react-hook-form';

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
  const {control} = useFormContext<TransactionFormSchema>();
  const displayAccounts = useDisplayBankAccounts();
  const {banks, bankAccounts: allAccounts} = useCoreDataContext();
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({field}) => {
        return (
          <FormItem className="col-span-6">
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Select
                {...field}
                value={field.value?.toString()}
                onChange={e => field.onChange(parseInt(e.target.value, 10))}
              >
                {accountGroups({
                  displayAccounts,
                  allAccounts,
                  accountId: field.value,
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
