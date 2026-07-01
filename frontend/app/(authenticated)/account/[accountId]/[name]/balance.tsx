'use client';
import {PricePerShare} from '@/app/(authenticated)/account/[accountId]/[name]/price-per-share';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {useCurrentBalances} from '@/lib/context/CurrentBalancesContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {useMarketDataContext} from '@/lib/context/MarketDataContext';
import {BankAccount} from '@/lib/model/BankAccount';
import {mustFindByCode} from '@/lib/model/Currency';
import {useOpenBankingFetchMetadata} from '@/lib/openbanking/context';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

export function BalanceCard({account}: {account: BankAccount}) {
  const {exchange} = useMarketDataContext();
  const displayCurrency = useDisplayCurrency();
  const balance = useCurrentBalances().of(account);
  const unit = balance.getUnit();
  const now = Date.now();
  const inDisplayCurrency = exchange.exchange(balance, displayCurrency, now);
  const inStockCurrency =
    unit.kind == 'stock'
      ? exchange.exchange(balance, mustFindByCode(unit.currencyCode), now)
      : null;
  const showInStockCurrency =
    !!inStockCurrency &&
    inStockCurrency.getCurrency().code !== displayCurrency.code;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Balance</CardTitle>
        <CurrencyDollarIcon className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div>
          <span className="text-3xl font-bold">{balance.format()}</span>
          <span className="text-muted-foreground ml-2">
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
  const {metadataByAccount} = useOpenBankingFetchMetadata();
  const balance = useCurrentBalances().of(account);
  const balanceNanos = metadataByAccount[account.id]?.balanceNanos;
  if (balanceNanos == null) {
    return null;
  }
  const remoteBalance = new AmountWithUnit({
    amountNanos: balanceNanos,
    unit: balance.getUnit(),
  });
  const delta = balance.subtract(remoteBalance);
  if (delta.isZero()) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircleIcon className="h-4 w-4" /> matches connected balance
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
