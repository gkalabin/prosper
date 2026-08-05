import {useExpenseCurrency} from '@/components/txform/expense/useExpenseCurrency';
import {useSharingType} from '@/components/txform/expense/useSharingType';
import {useSharingTypeActions} from '@/components/txform/expense/useSharingTypeActions';
import {usePayerName} from '@/components/txform/expense/usePayerName';
import {CategorySelect} from '@/components/txform/shared/CategorySelect';
import {MoneyInput} from '@/components/txform/shared/MoneyInput';
import {NewBalanceNote} from '@/components/txform/shared/NewBalanceNote';
import {Timestamp} from '@/components/txform/shared/Timestamp';
import {TransactionFormSchema} from '@/components/txform/types';
import {Button} from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {Select} from '@/components/ui/html-select';
import {assertDefined} from '@/lib/assert';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {SharingType} from '@/lib/grpc/gen/prosper/v1/ledger';
import {useDisplayBankAccounts} from '@/lib/model/AppDataModel';
import {groupAccountsByBank} from '@/lib/model/BankAccount';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useFormContext, useWatch} from 'react-hook-form';

export function RepaymentFields({
  transaction,
}: {
  transaction: Transaction | null;
}) {
  const {sharingType} = useSharingType();
  const {setOweMoney} = useSharingTypeActions();
  const {formState} = useFormContext<TransactionFormSchema>();
  const payer = usePayerName();
  if (sharingType != SharingType.PAID_OTHER_REPAID) {
    return null;
  }
  return (
    <div className="border-tint-foreground/25 animate-in fade-in mt-3 space-y-3 border-t pt-3 duration-200">
      <div className="flex items-center justify-between gap-2">
        <span className="text-tint-foreground text-xs font-bold uppercase tracking-wider">
          Repaid {payer ?? 'them'}
        </span>
        <Button
          type="button"
          variant="link"
          size="inherit"
          onClick={setOweMoney}
          disabled={formState.isSubmitting}
          className="text-muted-foreground hover:text-foreground text-xs font-semibold"
        >
          Not yet
        </Button>
      </div>
      <Timestamp fieldName="expense.repayment.timestamp" label="Repaid on" />
      <RepaymentAccountFrom transaction={transaction} />
      <RepaymentAmount />
      <RepaymentCategory />
    </div>
  );
}

function RepaymentAmount() {
  const ownShareAmount = useWatch({name: 'expense.ownShareAmount'});
  const currency = useExpenseCurrency();
  return (
    <FormItem>
      <FormLabel>Amount repaid</FormLabel>
      <FormControl>
        <MoneyInput disabled currency={currency} value={ownShareAmount} />
      </FormControl>
    </FormItem>
  );
}

function RepaymentAccountFrom({
  transaction,
}: {
  transaction: Transaction | null;
}) {
  const {control} = useFormContext<TransactionFormSchema>();
  const accounts = useDisplayBankAccounts();
  const {banks} = useCoreDataContext();
  const payer = usePayerName();
  const accountId = useWatch({name: 'expense.repayment.accountId'});
  const ownShare = useWatch({name: 'expense.ownShareAmount'});
  const repayment = useExistingRepayment(transaction);
  return (
    <FormField
      control={control}
      name="expense.repayment.accountId"
      render={({field}) => (
        <FormItem>
          <FormLabel>Paid {payer ?? 'them'} from</FormLabel>
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
            <div className="mt-2">
              <NewBalanceNote
                amount={-ownShare}
                accountId={accountId}
                transaction={repayment}
              />
            </div>
          )}
        </FormItem>
      )}
    />
  );
}

// The repayment of an expense paid by someone else is stored as a separate
// transaction, which is the one affecting the account balance.
function useExistingRepayment(expense: Transaction | null): Transaction | null {
  const {transactionLinks} = useTransactionDataContext();
  if (!expense) {
    return null;
  }
  const link = transactionLinks
    .filter(l => l.kind == 'DEBT_SETTLING')
    .find(l => l.expense.id == expense.id);
  return link?.repayment ?? null;
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
