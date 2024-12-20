import {accountBalance} from '@/app/(authenticated)/overview/modelHelpers';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useOpenBankingBalances} from '@/lib/openbanking/context';
import {cn} from '@/lib/utils';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export function NewBalanceNote({
  text,
  amount,
  accountId,
}: {
  text?: string;
  amount: number;
  accountId: number;
}) {
  const {bankAccounts, transactions, stocks} = useAllDatabaseDataContext();
  const {balances} = useOpenBankingBalances();
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
  const newLocalBalance = new AmountWithUnit({
    amountCents: localBalance.cents() + Math.round(amount * 100),
    unit: localBalance.getUnit(),
  });
  return (
    <div className="flex flex-row items-center gap-2 text-xs">
      <div className="whitespace-nowrap font-medium">
        {text ? text : 'New balance:'}
      </div>
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
        <div className="flex items-center gap-0.5 whitespace-nowrap text-xs font-light text-muted-foreground">
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
