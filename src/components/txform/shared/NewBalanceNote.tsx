import {accountBalance} from '@/app/(authenticated)/overview/modelHelpers';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {
  isIncome,
  isPersonalExpense,
  isTransfer,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {useOpenBankingBalances} from '@/lib/openbanking/context';
import {dollarToCents} from '@/lib/util/util';
import {cn} from '@/lib/utils';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {useFormContext} from 'react-hook-form';

function existingAmountCents({
  accountId,
  transaction,
}: {
  accountId: number;
  transaction: Transaction | null;
}) {
  if (!transaction) {
    return 0;
  }
  if (isPersonalExpense(transaction) && transaction.accountId == accountId) {
    return transaction.amountCents;
  }
  if (isIncome(transaction) && transaction.accountId == accountId) {
    return -transaction.amountCents;
  }
  if (isTransfer(transaction) && transaction.fromAccountId == accountId) {
    return transaction.sentAmountCents;
  }
  if (isTransfer(transaction) && transaction.toAccountId == accountId) {
    return -transaction.receivedAmountCents;
  }
  return 0;
}

export function NewBalanceNote({
  text,
  amount,
  accountId,
  transaction,
}: {
  text?: string;
  amount: number;
  accountId: number;
  transaction: Transaction | null;
}) {
  const {stocks, bankAccounts} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const {balances} = useOpenBankingBalances();
  const {
    formState: {isSubmitting},
  } = useFormContext();
  const amountCents = Math.round(amount * 100);
  if (!Number.isInteger(amountCents)) {
    return null;
  }
  const account = bankAccounts.find(a => a.id == accountId);
  if (!account) {
    return null;
  }
  const obBalance = balances?.find(b => b.internalAccountId === accountId);
  const localBalance = accountBalance(account, transactions, stocks);
  const remoteBalance = obBalance
    ? new AmountWithUnit({
        amountCents: obBalance.balanceCents,
        unit: localBalance.getUnit(),
      })
    : null;
  const newAmount = dollarToCents(amount);
  const existingAmount = existingAmountCents({accountId, transaction});
  const newLocalBalance = new AmountWithUnit({
    amountCents: localBalance.cents() + newAmount + existingAmount,
    unit: localBalance.getUnit(),
  });
  return (
    <div
      className={cn(
        'flex flex-row items-center gap-2 text-xs',
        isSubmitting && 'opacity-50'
      )}
    >
      <div className="whitespace-nowrap">{text ? text : 'New balance:'}</div>
      <div className="flex flex-wrap justify-evenly gap-1.5">
        <AccountBalanceText
          localBalance={newLocalBalance}
          remoteBalance={remoteBalance}
        />
      </div>
    </div>
  );
}

function AccountBalanceText({
  localBalance,
  remoteBalance,
}: {
  localBalance: AmountWithUnit;
  remoteBalance: AmountWithUnit | null;
}) {
  if (!remoteBalance) {
    return <div>{localBalance.format()}</div>;
  }
  const delta = localBalance.subtract(remoteBalance);
  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 whitespace-nowrap',
          delta.isZero() ? 'text-green-600' : 'text-red-600'
        )}
      >
        <div>{localBalance.format()}</div>
        {delta.isZero() && <CheckCircleIcon className="h-4 w-4" />}
      </div>
      {!delta.isZero() && (
        <div className="text-muted-foreground flex items-center gap-0.5 text-xs font-light whitespace-nowrap">
          {delta.isNegative() ? (
            <ArrowUpIcon className="h-2.5 w-2.5" />
          ) : (
            <ArrowDownIcon className="h-2.5 w-2.5" />
          )}
          {delta.abs().format()}
        </div>
      )}
    </>
  );
}
