'use client';
import {MaybeHiddenDiv} from '@/app/(authenticated)/overview/hide-balances';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {Account, accountUnit} from '@/lib/model/Account';
import {findAccountBalance} from '@/lib/model/queries/AccountBalance';
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
  return <MaybeHiddenDiv>{amount.round().format()}</MaybeHiddenDiv>;
}

export function AccountBalance({account}: {account: Account}) {
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

function LocalBalance({account}: {account: Account}) {
  const {stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const appBalance = findAccountBalance({account, transactions, stocks});
  return <MaybeHiddenDiv>{appBalance.format()}</MaybeHiddenDiv>;
}

function RemoteBalance({
  account,
  remoteBalance,
}: {
  account: Account;
  remoteBalance: AmountWithUnit;
}) {
  const {stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const localBalance = findAccountBalance({account, transactions, stocks});
  const delta = localBalance.subtract(remoteBalance);
  return (
    <div className="flex flex-col items-end">
      <div
        className={cn(
          'flex items-center gap-1',
          delta.isZero() ? 'text-green-600' : 'text-red-600'
        )}
      >
        <MaybeHiddenDiv>{localBalance.format()}</MaybeHiddenDiv>
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
