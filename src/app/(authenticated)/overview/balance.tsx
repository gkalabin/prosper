'use client';
import {useHideBalancesContext} from '@/app/(authenticated)/overview/context/hide-balances';
import {accountBalance} from '@/app/(authenticated)/overview/modelHelpers';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
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
  const hideBalances = useHideBalancesContext();
  if (!amount || hideBalances) {
    return null;
  }
  return <>{amount.round().format()}</>;
}

export function AccountBalance({account}: {account: BankAccount}) {
  const {balances} = useOpenBankingBalances();
  const {stocks} = useAllDatabaseDataContext();
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
  const hideBalances = useHideBalancesContext();
  const {transactions, stocks} = useAllDatabaseDataContext();
  if (hideBalances) {
    return null;
  }
  const appBalance = accountBalance(account, transactions, stocks);
  return <div>{appBalance.format()}</div>;
}

function RemoteBalance({
  account,
  remoteBalance,
}: {
  account: BankAccount;
  remoteBalance: AmountWithUnit;
}) {
  const hideBalances = useHideBalancesContext();
  const {transactions, stocks} = useAllDatabaseDataContext();
  const localBalance = accountBalance(account, transactions, stocks);
  const delta = localBalance.subtract(remoteBalance);
  return (
    <div className="flex flex-col items-end">
      <div
        className={cn(
          'flex items-center gap-1',
          delta.isZero() ? 'text-green-600' : 'text-red-600'
        )}
      >
        <div>{hideBalances ? '' : localBalance.format()}</div>
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