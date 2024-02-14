'use client';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {isExpense} from '@/lib/model/transaction/Transaction';
import {TransactionsStatsInput} from '@/lib/stats/TransactionsStatsInput';

export function PeriodSummary({input}: {input: TransactionsStatsInput}) {
  const displayCurrency = useDisplayCurrency();
  let expense = AmountWithCurrency.zero(displayCurrency);
  for (const {ownShare} of input.expenses()) {
    expense = expense.add(ownShare);
  }
  let income = AmountWithCurrency.zero(displayCurrency);
  for (const {ownShare} of input.income()) {
    income = income.add(ownShare);
  }
  const expenseIncomeRatio = income.isZero()
    ? Infinity
    : expense.dollar() / income.dollar();
  let trips = AmountWithCurrency.zero(displayCurrency);
  for (const {t, ownShare} of input.expenses()) {
    if (!isExpense(t) || !t.tripId) {
      continue;
    }
    trips = trips.add(ownShare);
  }
  return (
    <ul className="text-lg">
      <li>Spent: {expense.round().format()}</li>
      <li>Received: {income.round().format()}</li>
      <li>Delta: {income.subtract(expense).round().format()}</li>
      <li>Spent/received: {Math.round(expenseIncomeRatio * 100)}%</li>
      <li>Trips: {trips.round().format()}</li>
    </ul>
  );
}
