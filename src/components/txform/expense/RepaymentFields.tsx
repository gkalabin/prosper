import {useSharingType} from '@/components/txform/expense/useSharingType';
import {mostFrequentRepaymentCategories} from '@/components/txform/prefill';
import {CategorySelect} from '@/components/txform/shared/CategorySelect';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Select} from '@/components/ui/html-select';
import {Input} from '@/components/ui/input';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayBankAccounts} from '@/lib/model/AllDatabaseDataModel';
import {fullAccountName} from '@/lib/model/BankAccount';
import {useFormContext, useWatch} from 'react-hook-form';

export function RepaymentFields() {
  const {sharingType} = useSharingType();
  if (sharingType != 'PAID_OTHER_REPAID') {
    return null;
  }
  return (
    <div className="col-span-6 space-y-2 rounded border bg-accent p-2 pl-4">
      <Timestamp fieldName="expense.repayment.timestamp" />
      <RepaymentAmount />
      <RepaymentAccountFrom />
      <RepaymentCategory />
    </div>
  );
}

function RepaymentAmount() {
  const ownShareAmount = useWatch({
    name: 'expense.ownShareAmount',
  });
  return (
    <FormItem className="col-span-6">
      <FormLabel>Amount repaid</FormLabel>
      <FormControl>
        <Input
          type="text"
          inputMode="decimal"
          disabled={true}
          value={ownShareAmount}
        />
      </FormControl>
    </FormItem>
  );
}

function RepaymentAccountFrom() {
  const {getValues, control} = useFormContext<TransactionFormSchema>();
  const accounts = useDisplayBankAccounts();
  const {banks} = useAllDatabaseDataContext();
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
  const {control, formState} = useFormContext<TransactionFormSchema>();
  const {transactionLinks} = useAllDatabaseDataContext();
  const mostFrequentlyUsedCategoryIds =
    mostFrequentRepaymentCategories(transactionLinks);
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
              mostFrequentlyUsedCategoryIds={mostFrequentlyUsedCategoryIds}
              disabled={formState.isSubmitting}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
