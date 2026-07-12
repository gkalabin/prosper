import {useSharingType} from '@/components/txform/expense/useSharingType';
import {AccountSelect} from '@/components/txform/shared/Account';
import {CategorySelect} from '@/components/txform/shared/CategorySelect';
import {FieldLabel} from '@/components/txform/shared/FieldLabel';
import {DateTimeInput} from '@/components/txform/shared/Timestamp';
import {TransactionFormSchema} from '@/components/txform/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {assertDefined} from '@/lib/assert';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {useFormContext, useWatch} from 'react-hook-form';

export function RepaymentFields() {
  const {sharingType} = useSharingType();
  if (sharingType != SharingType.PAID_OTHER_REPAID) {
    return null;
  }
  return (
    <div className="col-span-6 border-t pt-4">
      <div className="text-brand-ink text-xs font-bold uppercase tracking-wider">
        Repayment
      </div>
      <div className="mt-3 grid grid-cols-6 gap-x-2.5 gap-y-4">
        <RepaymentTimestamp />
        <RepaymentAmount />
        <RepaymentAccountFrom />
        <RepaymentCategory />
      </div>
    </div>
  );
}

function RepaymentTimestamp() {
  const {control, setValue} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name="expense.repayment.timestamp"
      render={({field}) => (
        <FormItem className="col-span-4 space-y-1.5">
          <FieldLabel>Repaid on</FieldLabel>
          <FormControl>
            <DateTimeInput
              {...field}
              className="h-11 rounded-md px-2.5 text-sm tabular-nums"
              onChange={value => setValue('expense.repayment.timestamp', value)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function RepaymentAmount() {
  const ownShareAmount = useWatch({
    name: 'expense.ownShareAmount',
  });
  return (
    <FormItem className="col-span-2 space-y-1.5">
      <FieldLabel>Amount repaid</FieldLabel>
      <div className="border-input flex h-11 items-center rounded-md border border-dashed px-3.5 font-mono text-base font-semibold tabular-nums">
        {ownShareAmount}
      </div>
    </FormItem>
  );
}

function RepaymentAccountFrom() {
  const {control} = useFormContext<TransactionFormSchema>();
  return (
    <FormField
      control={control}
      name="expense.repayment.accountId"
      render={({field}) => (
        <FormItem className="col-span-6 space-y-1.5">
          <FieldLabel>Repaid from</FieldLabel>
          <FormControl>
            <AccountSelect
              {...field}
              className="h-11 rounded-md px-3.5 text-base"
            />
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
          <FormItem className="col-span-6 space-y-1.5">
            <FieldLabel>Repayment category</FieldLabel>
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
