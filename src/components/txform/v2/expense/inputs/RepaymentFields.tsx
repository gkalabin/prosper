import {useSharingType} from '@/components/txform/v2/expense/useSharingType';
import {CategorySelect} from '@/components/txform/v2/shared/CategorySelect';
import {Timestamp} from '@/components/txform/v2/shared/Timestamp';
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
import {isExpense, Transaction} from '@/lib/model/transaction/Transaction';
import {useCallback} from 'react';
import {useFormContext} from 'react-hook-form';

export function RepaymentFields() {
  const {sharingType} = useSharingType();
  if (sharingType != 'PAID_OTHER_REPAID') {
    return <></>;
  }
  return (
    <div className="col-span-6 space-y-2 rounded border bg-accent p-2 pl-4">
      <Timestamp fieldName="expense.repayment.timestamp" />
      <RepaymentAccountFrom />
      <RepaymentCategory />
    </div>
  );
}

function RepaymentAccountFrom() {
  const {getValues, control} = useFormContext<TransactionFormSchema>();
  const {paidSelf} = useSharingType();
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
  if (!paidSelf) {
    return <></>;
  }
  return (
    <FormField
      control={control}
      name="expense.repayment.accountId"
      render={({field}) => (
        <FormItem>
          <FormLabel>
            I&apos;ve paid {getValues('expense.payer') || 'them'} from
          </FormLabel>
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

function RepaymentCategory() {
  const {control, getValues} = useFormContext<TransactionFormSchema>();
  const vendor = getValues('expense.vendor') ?? '';
  // TODO: change to filter by repayment categories.
  const matchesVendorIfAny = useCallback(
    (t: Transaction) => !vendor || (isExpense(t) && t.vendor == vendor),
    [vendor]
  );
  return (
    <FormField
      control={control}
      name="expense.repayment.categoryId"
      render={({field}) => (
        <FormItem className="col-span-6">
          <FormLabel>Category</FormLabel>
          <FormControl>
            <CategorySelect
              value={field.value}
              onChange={field.onChange}
              relevantTransactionFilter={matchesVendorIfAny}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
