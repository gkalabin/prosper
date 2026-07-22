import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useCurrentBalances} from '@/lib/context/CurrentBalancesContext';
import {
  isIncome,
  isPersonalExpense,
  isTransfer,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {useOpenBankingFetchMetadata} from '@/lib/openbanking/context';
import {dollarToNanos} from '@/lib/util/util';
import {cn} from '@/lib/utils';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {useFormContext} from 'react-hook-form';

function existingAmountNanos({
  accountId,
  transaction,
}: {
  accountId: number;
  transaction: Transaction | null;
}): bigint {
  if (!transaction) {
    return 0n;
  }
  if (isPersonalExpense(transaction) && transaction.accountId == accountId) {
    return transaction.amountNanos;
  }
  if (isIncome(transaction) && transaction.accountId == accountId) {
    return -transaction.amountNanos;
  }
  if (isTransfer(transaction) && transaction.fromAccountId == accountId) {
    return transaction.sentAmountNanos;
  }
  if (isTransfer(transaction) && transaction.toAccountId == accountId) {
    return -transaction.receivedAmountNanos;
  }
  return 0n;
}

export function NewBalanceNote({
  text,
  amount,
  accountId,
  transaction,
}: {
  text?: string;
  // The amount fields are text inputs and the schema coerces them only at validation time.
  amount: number | string;
  accountId: number;
  transaction: Transaction | null;
}) {
  const {bankAccounts} = useCoreDataContext();
  const balances = useCurrentBalances();
  const {metadataByAccount} = useOpenBankingFetchMetadata();
  const {
    formState: {isSubmitting},
  } = useFormContext();
  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber)) {
    return null;
  }
  const account = bankAccounts.find(a => a.id == accountId);
  if (!account) {
    return null;
  }
  const remoteBalanceNanos = metadataByAccount[accountId]?.balanceNanos;
  const localBalance = balances.of(account);
  const remoteBalance =
    remoteBalanceNanos != null
      ? new AmountWithUnit({
          amountNanos: remoteBalanceNanos,
          unit: localBalance.getUnit(),
        })
      : null;
  const newAmountNanos = dollarToNanos(amountNumber);
  const existingNanos = existingAmountNanos({accountId, transaction});
  const newLocalBalance = new AmountWithUnit({
    amountNanos: localBalance.nanos() + newAmountNanos + existingNanos,
    unit: localBalance.getUnit(),
  });
  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-row flex-wrap items-center gap-x-2 gap-y-1 text-xs',
        isSubmitting && 'opacity-50'
      )}
    >
      <span className="whitespace-nowrap">{text ?? 'New balance'}</span>
      <AccountBalanceText
        localBalance={newLocalBalance}
        remoteBalance={remoteBalance}
      />
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
  const negative = localBalance.isNegative();
  const balance = (
    <span
      className={cn(
        'text-foreground font-mono font-medium tabular-nums',
        negative && 'text-down-amount'
      )}
    >
      {localBalance.format()}
    </span>
  );
  if (!remoteBalance) {
    return balance;
  }
  const delta = localBalance.subtract(remoteBalance);
  if (delta.isZero()) {
    return (
      <span className="text-up-amount flex items-center gap-1 whitespace-nowrap font-mono tabular-nums">
        {localBalance.format()}
        <CheckCircleIcon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {balance}
      <span className="text-muted-foreground flex items-center gap-0.5 whitespace-nowrap font-light">
        {delta.isNegative() ? (
          <ArrowUpIcon className="h-2.5 w-2.5" />
        ) : (
          <ArrowDownIcon className="h-2.5 w-2.5" />
        )}
        <span className="font-mono tabular-nums">{delta.abs().format()}</span>
      </span>
    </span>
  );
}
