'use client';
import {
  AccountBalance,
  BankBalance,
} from '@/app/(authenticated)/overview/balance';
import {OpenBankingConnectionExpirationWarning} from '@/app/(authenticated)/overview/OpenBankingConnectionExpirationWarning';
import {SignedDelta} from '@/app/(authenticated)/overview/signed-delta';
import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {Amount} from '@/lib/Amount';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useCurrentBalances} from '@/lib/context/CurrentBalancesContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {useMarketDataContext} from '@/lib/context/MarketDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {balancesAsOf} from '@/lib/model/balances';
import {
  accountPageURL,
  accountsForBank,
  accountUnit,
  Bank,
  BankAccount,
  bankPageURL,
} from '@/lib/model/BankAccount';
import {mustFindByCode} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {isStock} from '@/lib/model/Unit';
import {useOpenBankingFetchMetadata} from '@/lib/openbanking/context';
import {ChevronRightIcon, UsersIcon} from '@heroicons/react/24/outline';
import {subDays} from 'date-fns';
import Link from 'next/link';
import {useId} from 'react';

function accountCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'account' : 'accounts'}`;
}

export function BanksListItem({bank}: {bank: Bank}) {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts} = useCoreDataContext();
  const {exchange} = useMarketDataContext();
  const balances = useCurrentBalances();
  const accounts = accountsForBank(bank, bankAccounts);
  const activeAccounts = accounts.filter(a => !a.archived);
  const bankTotal = balances.sum(accounts, displayCurrency, exchange);
  const cardHeaderId = useId();
  return (
    <Card role="region" aria-labelledby={cardHeaderId}>
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-secondary text-foreground flex h-10 w-10 flex-none items-center justify-center rounded-xl text-base font-bold">
            {bank.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={cardHeaderId} className="truncate font-semibold">
              <Link href={bankPageURL(bank)}>{bank.name}</Link>
            </h2>
            <div className="text-muted-foreground text-xs">
              {accountCountLabel(activeAccounts.length)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-semibold">
              <BankBalance amount={bankTotal} />
            </div>
            <BankChange30d accounts={accounts} />
          </div>
        </div>
        <OpenBankingConnectionExpirationWarning bank={bank} />
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <ul className="border-border border-t border-dashed pt-1">
          {activeAccounts.map(account => (
            <BankAccountListItem
              key={account.id}
              account={account}
              bank={bank}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function BankChange30d({accounts}: {accounts: BankAccount[]}) {
  const displayCurrency = useDisplayCurrency();
  const {stocks} = useCoreDataContext();
  const {exchange} = useMarketDataContext();
  const {transactions} = useTransactionDataContext();
  const balances = useCurrentBalances();
  // Each endpoint is converted at its own date's rates so the delta reflects
  // both balance moves and market drift.
  const before = balancesAsOf(
    transactions,
    stocks,
    subDays(Date.now(), 30).getTime()
  ).sum(accounts, displayCurrency, exchange);
  const after = balances.sum(accounts, displayCurrency, exchange);
  if (!before || !after) {
    // When either sum is unavailable (some holding can't be converted at that date)
    // the change is omitted rather than showing a misleading delta from a dropped holding.
    return null;
  }
  const delta = after.subtract(before);
  return (
    <SignedDelta
      delta={delta}
      label="30d"
      className="font-mono text-xs font-normal"
    />
  );
}

export function BankAccountListItem({
  account,
  bank,
}: {
  account: BankAccount;
  bank: Bank;
}) {
  return (
    <li>
      <Link href={accountPageURL(account, bank)}>
        <div className="hover:bg-accent/50 flex items-center gap-3 rounded-xl px-2 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {account.name}
              </span>
              {account.joint && (
                <span className="text-muted-foreground flex flex-none items-center gap-1 text-xs">
                  <UsersIcon className="h-3.5 w-3.5" />
                  Joint
                </span>
              )}
            </div>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
              <AccountSubtitle account={account} />
            </div>
          </div>
          <AccountBalance account={account} />
          <ChevronRightIcon className="text-muted-foreground h-4 w-4 flex-none" />
        </div>
      </Link>
    </li>
  );
}

function AccountSubtitle({account}: {account: BankAccount}) {
  const {stocks} = useCoreDataContext();
  const unit = accountUnit(account, stocks);
  const sync = useSyncStatus(account);
  if (isStock(unit)) {
    return <StockHolding stock={unit} account={account} />;
  }
  if (sync) {
    return (
      <span className={sync.matched ? 'text-up-amount' : 'text-down-amount'}>
        {sync.matched ? '✓ matched' : `⚠ off ${sync.off}`}
      </span>
    );
  }
  return null;
}

// Describes a stock holding like "39 sh @ $234.56". The per-share
// price is omitted when no quote is available for the stock.
function StockHolding({stock, account}: {stock: Stock; account: BankAccount}) {
  const {exchange} = useMarketDataContext();
  const shares = useCurrentBalances().of(account).getAmount();
  const price = exchange.exchangeStock(
    Amount.fromDollar(1),
    stock,
    mustFindByCode(stock.currencyCode),
    Date.now()
  );
  return (
    <span>
      {shares.format()} sh
      {price ? ` @ ${price.format()}` : ''}
    </span>
  );
}

// Compares the locally computed balance against the bank-reported balance for
// connected accounts. Returns null when the account is not connected.
function useSyncStatus(
  account: BankAccount
): {matched: true} | {matched: false; off: string} | null {
  const {stocks} = useCoreDataContext();
  const {metadataByAccount} = useOpenBankingFetchMetadata();
  const balances = useCurrentBalances();
  const remoteBalanceNanos = metadataByAccount[account.id]?.balanceNanos;
  if (remoteBalanceNanos === null || remoteBalanceNanos === undefined) {
    return null;
  }
  const unit = accountUnit(account, stocks);
  const remoteBalance = new AmountWithUnit({
    amountNanos: remoteBalanceNanos,
    unit,
  });
  const localBalance = balances.of(account);
  const delta = localBalance.subtract(remoteBalance);
  if (delta.isZero()) {
    return {matched: true};
  }
  return {matched: false, off: delta.abs().format()};
}
