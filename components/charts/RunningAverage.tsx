import {CurrencyExchangeFailed} from 'app/stats/CurrencyExchangeFailed';
import {isWithinInterval, type Interval} from 'date-fns';
import ReactEcharts from 'echarts-for-react';
import {defaultMonthlyMoneyChart} from 'lib/charts';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {Income} from 'lib/model/transaction/Income';
import {Expense, Transaction} from 'lib/model/transaction/Transaction';
import {amountOwnShare} from 'lib/model/transaction/amounts';
import {
  Granularity,
  MoneyTimeseries,
  runningAverage,
} from 'lib/util/Timeseries';

export function RunningAverageOwnShare(props: {
  transactions: (Expense | Income)[];
  duration: Interval;
  maxWindowLength: number;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, stocks, exchange} = useAllDatabaseDataContext();
  const net = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  // TODO: validate that transactions can be exchanged on the page level
  // and only pass down the exchangeable ones as displaying the same
  // warning for each chart is noisy.
  const failedToExchange: Transaction[] = [];
  for (const t of props.transactions) {
    const amount = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!amount) {
      failedToExchange.push(t);
      continue;
    }
    net.increment(t.timestampEpoch, amount);
  }
  return (
    <>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
      <RunningAverageAmounts
        timeseries={net}
        duration={props.duration}
        maxWindowLength={props.maxWindowLength}
        title={props.title}
      />
    </>
  );
}

export function RunningAverageAmounts(props: {
  timeseries: MoneyTimeseries;
  duration: Interval;
  maxWindowLength: number;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const averageTimeseries = runningAverage(
    props.timeseries,
    props.maxWindowLength
  );
  const displayData = averageTimeseries
    .entries()
    .filter(x => isWithinInterval(x.time, props.duration));
  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultMonthlyMoneyChart(displayCurrency, props.duration),
        title: {
          text: props.title,
        },
        series: [
          {
            type: 'bar',
            name: props.title,
            data: displayData.map(x => x.sum.round().dollar()),
          },
        ],
      }}
    />
  );
}
