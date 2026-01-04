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
import {useDisplayBankAccounts} from '@/lib/model/AllDatabaseDataModel';
import {BankAccount, fullAccountName} from '@/lib/model/BankAccount';
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
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Select
              {...field}
              value={field.value?.toString()}
              onChange={e => field.onChange(parseInt(e.target.value, 10))}
            >
              {accountOptions({
                displayAccounts,
                allAccounts,
                accountId: field.value,
              }).map(x => (
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

// Returns a list of accounts to display in the dropdown.
// Makes sure the current selection is always in the list
// even if it's not in the displayAccounts (e.g. when the account has been archived).
function accountOptions({
  displayAccounts,
  allAccounts,
  accountId,
}: {
  displayAccounts: BankAccount[];
  allAccounts: BankAccount[];
  accountId?: number | null;
}) {
  if (!accountId) {
    return displayAccounts;
  }
  if (displayAccounts.some(x => x.id == accountId)) {
    return displayAccounts;
  }
  const account = allAccounts.find(x => x.id == accountId);
  if (!account) {
    return displayAccounts;
  }
  return [account, ...displayAccounts];
}
