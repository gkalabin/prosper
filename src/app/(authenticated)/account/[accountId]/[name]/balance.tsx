'use client';
import {PricePerShare} from '@/app/(authenticated)/account/[accountId]/[name]/price-per-share';
import {accountBalance} from '@/app/(authenticated)/overview/modelHelpers';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {assert} from '@/lib/assert';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {accountUnit, BankAccount} from '@/lib/model/BankAccount';
import {Currency, mustFindByCode} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {Transaction} from '@/lib/model/transaction/Transaction';
import {useOpenBankingBalances} from '@/lib/openbanking/context';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

function getAccountBalanceInDisplayCurrency({
  account,
  transactions,
  stocks,
  exchange,
  displayCurrency,
}: {
  account: BankAccount;
  transactions: Transaction[];
  stocks: Stock[];
  exchange: StockAndCurrencyExchange;
  displayCurrency: Currency;
}): AmountWithCurrency | null {
  const balance = accountBalance(account, transactions, stocks);
  const unit = balance.getUnit();
  const now = new Date();
  if (unit.kind === 'currency' && unit.code === displayCurrency.code) {
    return null;
  }
  if (unit.kind === 'currency') {
    const amount = new AmountWithCurrency({
      amountCents: balance.getAmount().cents(),
      currency: unit,
    });
    const inDisplayCurrency = exchange.exchangeCurrency(
      amount,
      displayCurrency,
      now
    );
    if (!inDisplayCurrency) {
      return null;
    }
    return inDisplayCurrency;
  }
  assert(unit.kind === 'stock');
  const stockCurrency = mustFindByCode(unit.currencyCode);
  const inStockCurrency = exchange.exchangeStock(
    balance.getAmount(),
    unit,
    stockCurrency,
    now
  );
  if (!inStockCurrency) {
    return null;
  }
  if (stockCurrency.code === displayCurrency.code) {
    return inStockCurrency;
  }
  const inDisplayCurrency = exchange.exchangeCurrency(
    inStockCurrency,
    displayCurrency,
    now
  );
  if (!inDisplayCurrency) {
    return null;
  }
  return inDisplayCurrency;
}

function getAccountBalanceInStockCurrency({
  account,
  transactions,
  stocks,
  exchange,
}: {
  account: BankAccount;
  transactions: Transaction[];
  stocks: Stock[];
  exchange: StockAndCurrencyExchange;
}): AmountWithCurrency | null {
  const unit = accountUnit(account, stocks);
  if (unit.kind != 'stock') {
    return null;
  }
  const balance = accountBalance(account, transactions, stocks);
  const now = new Date();
  const stockCurrency = mustFindByCode(unit.currencyCode);
  const inStockCurrency = exchange.exchangeStock(
    balance.getAmount(),
    unit,
    stockCurrency,
    now
  );
  if (!inStockCurrency) {
    return null;
  }
  return inStockCurrency;
}

export function BalanceCard({account}: {account: BankAccount}) {
  const {stocks, transactions, exchange} = useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  const balance = accountBalance(account, transactions, stocks);
  const inDisplayCurrency = getAccountBalanceInDisplayCurrency({
    account,
    stocks,
    transactions,
    exchange,
    displayCurrency,
  });
  const inStockCurrency = getAccountBalanceInStockCurrency({
    account,
    stocks,
    transactions,
    exchange,
  });
  // InStockCurrency is defined and is different from displayCurrency.
  const showInStockCurrency =
    !!inStockCurrency &&
    inStockCurrency.getCurrency().code !== displayCurrency.code;
  const unit = accountUnit(account, stocks);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Balance</CardTitle>
        <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div>
          <span className="text-3xl font-bold">{balance.format()}</span>
          <span className="ml-2 text-muted-foreground">
            {inDisplayCurrency ? ' / ' + inDisplayCurrency.format() : ''}
            {showInStockCurrency ? ' / ' + inStockCurrency.format() : ''}
          </span>
        </div>
        <OpenBankingBalanceDelta account={account} />
        {unit.kind == 'stock' && (
          <div>
            Price per share: <PricePerShare stock={unit} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OpenBankingBalanceDelta({account}: {account: BankAccount}) {
  const {stocks, transactions} = useAllDatabaseDataContext();
  const {balances, isLoading} = useOpenBankingBalances();
  if (isLoading) {
    return <div>Loading balance from the bank...</div>;
  }
  const obBalance = balances?.find(b => b.internalAccountId === account.id);
  if (!obBalance) {
    return null;
  }
  const unit = accountUnit(account, stocks);
  const remoteBalance = new AmountWithUnit({
    amountCents: obBalance.balanceCents,
    unit,
  });
  const balance = accountBalance(account, transactions, stocks);
  const delta = balance.subtract(remoteBalance);
  if (delta.isZero()) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircleIcon className="h-4 w-4" /> matches connected balance
        balance
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-red-600">
      {delta.isNegative() ? (
        <ArrowUpIcon className="h-4 w-4" />
      ) : (
        <ArrowDownIcon className="h-4 w-4" />
      )}
      {delta.abs().format()} {delta.isNegative() ? 'less' : 'more'} than
      connected balance
    </div>
  );
}
