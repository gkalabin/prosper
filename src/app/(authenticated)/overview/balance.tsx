'use client';
import {MaybeHiddenText} from '@/app/(authenticated)/overview/hide-balances';
import {accountBalance} from '@/app/(authenticated)/overview/modelHelpers';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {BankAccount, accountUnit} from '@/lib/model/BankAccount';
import {useOpenBankingBalances} from '@/lib/openbanking/context';
import {cn} from '@/lib/utils';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export function BankBalance({
  amount,
}: {
  amount: AmountWithCurrency | undefined;
}) {
  if (!amount) {
    return null;
  }
  const formattedAmount = amount.round().format();
  return (
    <MaybeHiddenText textLength={formattedAmount.length}>
      {formattedAmount}
    </MaybeHiddenText>
  );
}

export function AccountBalance({account}: {account: BankAccount}) {
  const {balances} = useOpenBankingBalances();
  const {stocks} = useCoreDataContext();
  const obBalance = balances?.find(b => b.internalAccountId === account.id);
  if (!obBalance) {
    return <LocalBalance account={account} />;
  }
  const unit = accountUnit(account, stocks);
  const remoteBalance = new AmountWithUnit({
    amountCents: obBalance.balanceCents,
    unit,
  });
  return <RemoteBalance account={account} remoteBalance={remoteBalance} />;
}

function LocalBalance({account}: {account: BankAccount}) {
  const {stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const appBalance = accountBalance(account, transactions, stocks);
  const formattedBalance = appBalance.format();
  return (
    <MaybeHiddenText textLength={formattedBalance.length}>
      <div>{formattedBalance}</div>
    </MaybeHiddenText>
  );
}

function RemoteBalance({
  account,
  remoteBalance,
}: {
  account: BankAccount;
  remoteBalance: AmountWithUnit;
}) {
  const {stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const localBalance = accountBalance(account, transactions, stocks);
  const delta = localBalance.subtract(remoteBalance);
  const formattedLocalBalance = localBalance.format();
  return (
    <div className="flex flex-col items-end">
      <div
        className={cn(
          'flex items-center gap-1',
          delta.isZero() ? 'text-green-600' : 'text-red-600'
        )}
      >
        <MaybeHiddenText textLength={formattedLocalBalance.length}>
          <div>{formattedLocalBalance}</div>
        </MaybeHiddenText>
        {delta.isZero() && <CheckCircleIcon className="h-4 w-4" />}
      </div>
      {!delta.isZero() && (
        <div className="flex items-center gap-1 text-xs font-light text-muted-foreground">
          {delta.isNegative() ? (
            <ArrowUpIcon className="h-2.5 w-2.5" />
          ) : (
            <ArrowDownIcon className="h-2.5 w-2.5" />
          )}
          {delta.abs().format()}
        </div>
      )}
    </div>
  );
}
