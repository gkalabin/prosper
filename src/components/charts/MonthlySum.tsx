import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {eachMonthOfInterval, type Interval} from 'date-fns';
import ReactEcharts from 'echarts-for-react';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {StockAndCurrencyExchange} from '@/lib/ClientSideModel';
import {defaultMonthlyMoneyChart} from '@/lib/charts';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {BankAccount} from '@/lib/model/BankAccount';
import {Currency} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {Income} from '@/lib/model/transaction/Income';
import {Expense, Transaction} from '@/lib/model/transaction/Transaction';
import {
  amountAllParties,
  amountOwnShare,
} from '@/lib/model/transaction/amounts';
import {MoneyTimeseries} from '@/lib/util/Timeseries';
import {Granularity} from '@/lib/util/Granularity';

export function MonthlyOwnShare(props: {
  transactions: (Expense | Income)[];
  duration: Interval;
  title: string;
}) {
  return <Monthly {...props} amountFn={amountOwnShare} />;
}

export function MonthlyAllParties(props: {
  transactions: (Expense | Income)[];
  duration: Interval;
  title: string;
}) {
  return <Monthly {...props} amountFn={amountAllParties} />;
}

function Monthly({
  transactions,
  amountFn,
  duration,
  title,
}: {
  transactions: (Expense | Income)[];
  duration: Interval;
  title: string;
  amountFn: (
    t: Expense | Income,
    target: Currency,
    bankAccounts: BankAccount[],
    stocks: Stock[],
    exchange: StockAndCurrencyExchange
  ) => AmountWithCurrency | undefined;
}) {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, stocks, exchange} = useAllDatabaseDataContext();
  const months = eachMonthOfInterval(duration);
  const data = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  // TODO: validate that transactions can be exchanged on the page level
  // and only pass down the exchangeable ones as displaying the same
  // warning for each chart is noisy.
  const failedToExchange: Transaction[] = [];
  for (const t of transactions) {
    const amount = amountFn(t, displayCurrency, bankAccounts, stocks, exchange);
    if (!amount) {
      failedToExchange.push(t);
      continue;
    }
    data.increment(t.timestampEpoch, amount);
  }
  return (
    <>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
      <ReactEcharts
        notMerge
        option={{
          ...defaultMonthlyMoneyChart(displayCurrency, duration),
          title: {
            text: title,
          },
          series: [
            {
              type: 'bar',
              name: title,
              data: months.map(m => data.get(m).round().dollar()),
            },
          ],
        }}
      />
    </>
  );
}
