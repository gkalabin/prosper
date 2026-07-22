import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {CategorySelect} from '@/components/txform/shared/CategorySelect';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
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
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useFormContext, useWatch} from 'react-hook-form';

function firstName(name: string): string {
  return name.trim().split(' ')[0] || 'them';
}

// RepaymentFields is the deepest reveal: shown only once the user says they've
// already paid the original payer back. It records when, from which account
// (with a balance preview), how much (their share, read-only), and under which
// category.
export function RepaymentFields({
  transaction,
}: {
  transaction: Transaction | null;
}) {
  const {sharingType} = useSharingType();
  const {setOweMoney} = useSharingTypeActions();
  const {getValues, formState} = useFormContext<TransactionFormSchema>();
  if (sharingType != SharingType.PAID_OTHER_REPAID) {
    return null;
  }
  const payer = firstName(getValues('expense.payer') ?? '');
  return (
    <div className="border-tint-foreground/25 animate-in fade-in mt-3 space-y-3 border-t pt-3 duration-200">
      <div className="flex items-center justify-between gap-2">
        <span className="text-tint-foreground text-[11px] font-bold uppercase tracking-wider">
          Repaid {payer}
        </span>
        <button
          type="button"
          onClick={setOweMoney}
          disabled={formState.isSubmitting}
          className="text-muted-foreground hover:text-foreground text-xs font-semibold disabled:opacity-50"
        >
          Not yet
        </button>
      </div>
      <Timestamp fieldName="expense.repayment.timestamp" label="Repaid on" />
      <RepaymentAccountFrom transaction={transaction} />
      <div className="grid grid-cols-2 gap-3">
        <RepaymentAmount />
        <RepaymentCategory />
      </div>
    </div>
  );
}

function RepaymentAmount() {
  const ownShareAmount = useWatch({name: 'expense.ownShareAmount'});
  return (
    <FormItem>
      <FormLabel>Amount repaid</FormLabel>
      <FormControl>
        <Input
          type="text"
          inputMode="decimal"
          disabled={true}
          className="font-mono tabular-nums"
          value={ownShareAmount}
        />
      </FormControl>
      <p className="text-muted-foreground mt-1 text-xs">= your share</p>
    </FormItem>
  );
}

function RepaymentAccountFrom({
  transaction,
}: {
  transaction: Transaction | null;
}) {
  const {getValues, control} = useFormContext<TransactionFormSchema>();
  const accounts = useDisplayBankAccounts();
  const {banks} = useCoreDataContext();
  const accountId = useWatch({name: 'expense.repayment.accountId'});
  const ownShare = useWatch({name: 'expense.ownShareAmount'});
  return (
    <FormField
      control={control}
      name="expense.repayment.accountId"
      render={({field}) => (
        <FormItem>
          <FormLabel>
            Paid {getValues('expense.payer') || 'them'} from
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
          {accountId && (
            <div className="mt-1.5">
              <NewBalanceNote
                amount={-ownShare}
                accountId={accountId}
                transaction={transaction}
              />
            </div>
          )}
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
          <FormItem>
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
