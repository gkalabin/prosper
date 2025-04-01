'use client';
import {MaybeHiddenDiv} from '@/app/(authenticated)/overview/hide-balances';
import {Card, CardContent} from '@/components/ui/card';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {useMarketDataContext} from '@/lib/context/MarketDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {ownedAssetAccounts} from '@/lib/model/Account';
import {findAccountsBalanceTotal} from '@/lib/model/queries/AccountsBalanceTotal';
import {exchangeTransactionAmounts} from '@/lib/model/queries/ExchangeTransactionAmounts';
import {differenceInDays} from 'date-fns';

export function StatsWidget() {
  const displayCurrency = useDisplayCurrency();
  const {accounts, stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const {exchange} = useMarketDataContext();
  const assets = ownedAssetAccounts(accounts);
  const total = findAccountsBalanceTotal({
    accounts: assets,
    targetCurrency: displayCurrency,
    exchange,
    transactions,
    stocks,
  });
  if (!total) {
    return null;
  }
  return (
    <>
      <div className="py-5">
        <div className="text-2xl font-bold">Your total balance</div>
        <MaybeHiddenDiv className="inline-block bg-gradient-to-r from-indigo-600 via-purple-500 via-55% to-orange-400 bg-clip-text text-3xl font-bold text-transparent">
          {total.round().format()}
        </MaybeHiddenDiv>
      </div>
      <Last30DaysIncomeExpense />
    </>
  );
}

export function Last30DaysIncomeExpense() {
  const displayCurrency = useDisplayCurrency();
  const {accounts, stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const {exchange} = useMarketDataContext();
  const now = Date.now();
  const transactions30d = transactions.filter(
    t => differenceInDays(now, t.timestampEpoch) <= 30
  );
  const {exchanged, failed} = exchangeTransactionAmounts({
    targetCurrency: displayCurrency,
    transactions: transactions30d,
    accounts,
    stocks,
    exchange,
  });
  if (failed.length > 0) {
    return null;
  }
  let expense = AmountWithCurrency.zero(exchanged.currency());
  for (const {ownShare} of exchanged.expenses()) {
    expense = expense.add(ownShare);
  }
  let income = AmountWithCurrency.zero(exchanged.currency());
  for (const {ownShare} of exchanged.income()) {
    income = income.add(ownShare);
  }
  return (
    <Card>
      <CardContent className="py-0">
        <div className="flex flex-row justify-center">
          <div className="flex grow flex-col items-center gap-1 p-1">
            <div className="text-sm font-medium text-muted-foreground">
              Expense
            </div>
            <MaybeHiddenDiv className="text-lg font-medium">
              {expense.round().format()}
            </MaybeHiddenDiv>
          </div>
          <div className="w-0 border-l">&nbsp;</div>
          <div className="flex grow flex-col items-center gap-1 p-1">
            <div className="text-sm font-medium text-muted-foreground">
              Income
            </div>
            <MaybeHiddenDiv className="text-lg font-medium">
              {income.round().format()}
            </MaybeHiddenDiv>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
