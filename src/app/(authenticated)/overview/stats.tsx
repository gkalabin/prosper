'use client';
import {MaybeHiddenText} from '@/app/(authenticated)/overview/hide-balances';
import {accountsSum} from '@/app/(authenticated)/overview/modelHelpers';
import {useExchangedTransactions} from '@/app/(authenticated)/stats/modelHelpers';
import {Card, CardContent} from '@/components/ui/card';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {useMarketDataContext} from '@/lib/context/MarketDataContext';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {
  isExpense,
  isIncome,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {differenceInDays} from 'date-fns';

export function StatsWidget() {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, stocks} = useCoreDataContext();
  const {transactions} = useTransactionDataContext();
  const {exchange} = useMarketDataContext();
  const total = accountsSum(
    bankAccounts,
    displayCurrency,
    exchange,
    transactions,
    stocks
  );
  if (!total) {
    return <></>;
  }
  const totalFormatted = total.round().format();
  return (
    <>
      <div className="py-5">
        <div className="text-2xl font-bold">Your total balance</div>
        <MaybeHiddenText textLength={totalFormatted.length}>
          <div className="text-3xl font-bold">
            <div className="inline-block bg-gradient-to-r from-indigo-600 via-purple-500 via-55% to-orange-400 bg-clip-text text-transparent">
              {totalFormatted}
            </div>
          </div>
        </MaybeHiddenText>
      </div>
      <Last30DaysIncomeExpense />
    </>
  );
}

export function Last30DaysIncomeExpense() {
  const {transactions} = useTransactionDataContext();
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
  const expenseFormatted = expense.round().format();
  let income = AmountWithCurrency.zero(input.currency());
  for (const {ownShare} of input.income()) {
    income = income.add(ownShare);
  }
  const incomeFormatted = income.round().format();
  return (
    <Card>
      <CardContent className="py-0">
        <div className="flex flex-row justify-center">
          <div className="flex grow flex-col items-center gap-1 p-1">
            <div className="text-sm font-medium text-muted-foreground">
              Expense
            </div>
            <MaybeHiddenText textLength={expenseFormatted.length}>
              <div className="text-lg font-medium">{expenseFormatted}</div>
            </MaybeHiddenText>
          </div>
          <div className="w-0 border-l">&nbsp;</div>
          <div className="flex grow flex-col items-center gap-1 p-1">
            <div className="text-sm font-medium text-muted-foreground">
              Income
            </div>
            <MaybeHiddenText textLength={incomeFormatted.length}>
              <div className="text-lg font-medium">{incomeFormatted}</div>
            </MaybeHiddenText>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
