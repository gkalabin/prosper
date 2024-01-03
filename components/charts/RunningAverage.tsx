import {CurrencyExchangeFailed} from 'app/stats/CurrencyExchangeFailed';
import {Interval} from 'date-fns';
import ReactEcharts from 'echarts-for-react';
import {useAllDatabaseDataContext} from 'lib/context/AllDatabaseDataContext';
import {defaultMonthlyMoneyChart, monthlyData} from 'lib/charts';
import {useDisplayCurrency} from 'lib/context/DisplaySettingsContext';
import {Income} from 'lib/model/transaction/Income';
import {Expense, Transaction} from 'lib/model/transaction/Transaction';
import {amountOwnShare} from 'lib/model/transaction/amounts';
import {MoneyTimeseries} from 'lib/util/Timeseries';
import {runningAverage} from 'lib/util/util';

export function RunningAverageOwnShare(props: {
  transactions: (Expense | Income)[];
  duration: Interval;
  maxWindowLength: number;
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, stocks, exchange} = useAllDatabaseDataContext();
  const net = new MoneyTimeseries(displayCurrency);
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
    net.append(t.timestampEpoch, amount);
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
  const averages = runningAverage(
    props.timeseries.monthlyMap(),
    props.maxWindowLength
  );
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
            data: monthlyData(props.duration, averages),
          },
        ],
      }}
    />
  );
}
