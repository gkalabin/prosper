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
        'text-muted-foreground flex flex-row items-baseline gap-2 text-[13px]',
        isSubmitting && 'opacity-50'
      )}
    >
      <div className="whitespace-nowrap">{text ? text : 'New balance'}</div>
      <div className="flex flex-wrap items-baseline justify-evenly gap-1.5">
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
    return (
      <div className="text-foreground font-mono font-semibold tabular-nums">
        {localBalance.format()}
      </div>
    );
  }
  const delta = localBalance.subtract(remoteBalance);
  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 whitespace-nowrap font-mono font-semibold tabular-nums',
          delta.isZero() ? 'text-up-amount' : 'text-down-amount'
        )}
      >
        <div>{localBalance.format()}</div>
        {delta.isZero() && <CheckCircleIcon className="h-4 w-4" />}
      </div>
      {!delta.isZero() && (
        <div className="text-muted-foreground flex items-center gap-0.5 whitespace-nowrap text-xs font-light">
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
