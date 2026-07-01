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
  amount: number;
  accountId: number;
  transaction: Transaction | null;
}) {
  const {bankAccounts} = useCoreDataContext();
  const balances = useCurrentBalances();
  const {metadataByAccount} = useOpenBankingFetchMetadata();
  const {
    formState: {isSubmitting},
  } = useFormContext();
  if (!Number.isFinite(amount)) {
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
  const newAmountNanos = dollarToNanos(amount);
  const existingNanos = existingAmountNanos({accountId, transaction});
  const newLocalBalance = new AmountWithUnit({
    amountNanos: localBalance.nanos() + newAmountNanos + existingNanos,
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
