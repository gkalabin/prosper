'use client';
import {useHideBalancesContext} from '@/app/(authenticated)/overview/context/hide-balances';
import {accountsSum} from '@/app/(authenticated)/overview/modelHelpers';
import {Card, CardContent} from '@/components/ui/card';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {
  isExpense,
  isIncome,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {differenceInDays} from 'date-fns';
import {useExchangedTransactions} from '../stats/modelHelpers';

export function StatsWidget() {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, transactions, exchange, stocks} =
    useAllDatabaseDataContext();
  const hideBalances = useHideBalancesContext();
  const total = accountsSum(
    bankAccounts,
    displayCurrency,
    exchange,
    transactions,
    stocks
  );
  if (!total || hideBalances) {
    return <></>;
  }
  return (
    <>
      <div className="py-5">
        <div className="text-2xl font-bold">Your total balance</div>
        <div className="text-3xl font-bold">
          <div className="inline-block bg-gradient-to-r from-indigo-600 via-purple-500 via-55% to-orange-400 bg-clip-text text-transparent">
            {total.round().format()}
          </div>
        </div>
      </div>
      <Last30DaysIncomeExpense />
    </>
  );
}

export function Last30DaysIncomeExpense() {
  const {transactions} = useAllDatabaseDataContext();
  const now = Date.now();
  const last30days = (t: Transaction) =>
    differenceInDays(now, t.timestampEpoch) <= 30;
  const {input, failed} = useExchangedTransactions(
    transactions.filter(t => isIncome(t) || isExpense(t)).filter(last30days)
  );
  if (failed.length > 0) {
    return <></>;
  }
  let expense = AmountWithCurrency.zero(input.currency());
  for (const {ownShare} of input.expenses()) {
    expense = expense.add(ownShare);
  }
  let income = AmountWithCurrency.zero(input.currency());
  for (const {ownShare} of input.income()) {
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
            <div className="text-lg font-medium">
              {expense.round().format()}
            </div>
          </div>
          <div className="w-0 border-l">&nbsp;</div>
          <div className="flex grow flex-col items-center gap-1 p-1">
            <div className="text-sm font-medium text-muted-foreground">
              Income
            </div>
            <div className="text-lg font-medium">{income.round().format()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
