import {CurrencyExchangeFailed} from 'app/stats/CurrencyExchangeFailed';
import Charts from 'components/charts/interface';
import {type Interval} from 'date-fns';
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
  const averageTimeseries = runningAverage(net, props.maxWindowLength);
  return (
    <>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
      <Charts.Bar
        title={props.title}
        series={{data: averageTimeseries}}
        interval={props.duration}
      />
    </>
  );
}
