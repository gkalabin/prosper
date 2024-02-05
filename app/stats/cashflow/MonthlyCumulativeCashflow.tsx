'use client';
import Charts from 'components/charts/interface';
import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {Granularity, MoneyTimeseries} from 'lib/util/Timeseries';

export function MonthlyCumulativeCashflow({
  input,
}: {
  input: TransactionsStatsInput;
}) {
  const displayCurrency = useDisplayCurrency();
  const cashflow = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  for (const {t, ownShare} of input.incomeExchanged()) {
    cashflow.increment(t.timestampEpoch, ownShare);
  }
  for (const {t, ownShare} of input.expensesExchanged()) {
    cashflow.increment(t.timestampEpoch, ownShare.negate());
  }
  const cumulative = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  let current = AmountWithCurrency.zero(displayCurrency);
  for (const m of input.months()) {
    current = current.add(cashflow.get(m));
    cumulative.set(m, current);
  }
  return (
    <Charts.Line
      title={'Cumulative monthly cashflow'}
      series={{data: cumulative}}
      interval={input.interval()}
    />
  );
}
