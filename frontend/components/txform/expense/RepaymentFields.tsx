import {useSharingType} from '@/components/txform/expense/useSharingType';
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
import {assertDefined} from '@/lib/assert';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {useDisplayBankAccounts} from '@/lib/model/AppDataModel';
import {groupAccountsByBank} from '@/lib/model/BankAccount';
import {useFormContext, useWatch} from 'react-hook-form';

export function RepaymentFields() {
  const {sharingType} = useSharingType();
  if (sharingType != SharingType.PAID_OTHER_REPAID) {
    return null;
  }
  return (
    <div className="bg-accent col-span-6 space-y-2 rounded border p-2 pl-4">
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
  const {banks} = useCoreDataContext();
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
              {groupAccountsByBank(accounts, banks).map(group => (
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
      )}
    />
  );
}

function RepaymentCategory() {
  const {control, formState} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name="expense.repayment.categoryId"
      render={({field}) => {
        assertDefined(
          field.value,
          'repayment category required for a repaid expense'
        );
        return (
          <FormItem className="col-span-6">
            <FormLabel>Repayment category</FormLabel>
            <FormControl>
              <CategorySelect
                value={field.value}
                onChange={field.onChange}
                disabled={formState.isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
