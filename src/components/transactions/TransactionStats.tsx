import {CurrencyExchangeFailed} from '@/app/stats/CurrencyExchangeFailed';
import {
  ChildCategoryFullAmountChart,
  ChildCategoryOwnShareChart,
} from '@/components/charts/CategoryPie';
import {
  MonthlyAllParties,
  MonthlyOwnShare,
} from '@/components/charts/MonthlySum';
import {TransactionFrequencyChart} from '@/components/charts/TransactionFrequency';
import {YearlyAllParties, YearlyOwnShare} from '@/components/charts/YearlySum';
import {ButtonFormSecondary} from '@/components/ui/buttons';
import {differenceInMonths, startOfMonth} from 'date-fns';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {useDisplayCurrency} from '@/lib/context/DisplaySettingsContext';
import {Income} from '@/lib/model/transaction/Income';
import {
  Expense,
  Transaction,
  isExpense,
  isIncome,
  isPersonalExpense,
  isThirdPartyExpense,
  isTransfer,
} from '@/lib/model/transaction/Transaction';
import {
  amountAllParties,
  amountOwnShare,
} from '@/lib/model/transaction/amounts';
import {AppendMap} from '@/lib/util/AppendMap';
import {MoneyTimeseries, percentile} from '@/lib/util/Timeseries';
import {Granularity} from '@/lib/util/Granularity';
import {capitalize} from '@/lib/util/util';

export function TransactionStats(props: {
  onClose: () => void;
  transactions: Transaction[];
}) {
  const transactionsByTimestamp = [...props.transactions].sort(
    (a, b) => a.timestampEpoch - b.timestampEpoch
  );
  return (
    <div className="grid grid-cols-6 gap-6 bg-white p-2 shadow sm:rounded-md sm:p-6">
      <div className="col-span-6 text-xl font-medium leading-7">Stats</div>
      {!props.transactions.length && <div>No transactions found</div>}
      {!!props.transactions.length && (
        <NonEmptyTransactionStats
          onClose={props.onClose}
          transactions={transactionsByTimestamp}
        />
      )}
    </div>
  );
}

function NonEmptyTransactionStats({
  onClose,
  transactions,
}: {
  onClose: () => void;
  transactions: Transaction[];
}) {
  return (
    <>
      <div className="col-span-6">
        <TextSummary transactions={transactions} />
      </div>

      <Charts transactions={transactions} />

      <div className="col-span-6">
        <ButtonFormSecondary onClick={onClose}>Close</ButtonFormSecondary>
      </div>
    </>
  );
}

function TextSummary({transactions}: {transactions: Transaction[]}) {
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  return (
    <div className="col-span-6">
      Matched {transactions.length} transactions over the last{' '}
      {differenceInMonths(last.timestampEpoch, first.timestampEpoch)} months
      <div className="ml-2 text-sm text-slate-600">
        <div>
          Personal: {transactions.filter(t => isPersonalExpense(t)).length}
        </div>
        <div>
          External: {transactions.filter(t => isThirdPartyExpense(t)).length}
        </div>
        <div>Transfers: {transactions.filter(t => isTransfer(t)).length}</div>
        <div>Income: {transactions.filter(t => isIncome(t)).length}</div>
        <div>First: {new Date(first.timestampEpoch).toISOString()}</div>
        <div>Last: {new Date(last.timestampEpoch).toISOString()}</div>
      </div>
    </div>
  );
}

function Charts({transactions}: {transactions: Transaction[]}) {
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  const duration = {start: first.timestampEpoch, end: last.timestampEpoch};
  return (
    <div className="col-span-6">
      <TransactionFrequencyChart
        duration={duration}
        transactions={transactions}
      />
      <h1 className="mb-1 mt-4 text-xl font-medium leading-7">Expenses</h1>
      <ExenseStats transactions={transactions} />
      <h1 className="mb-1 mt-4 text-xl font-medium leading-7">Income</h1>
      <IncomeStats transactions={transactions} />
    </div>
  );
}

function IncomeOrExenseStats({
  transactions,
}: {
  transactions: (Income | Expense)[];
}) {
  const displayCurrency = useDisplayCurrency();
  const {bankAccounts, stocks, exchange} = useAllDatabaseDataContext();
  if (!transactions.length) {
    return <></>;
  }
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  const spentOrReceived = first.kind == 'Income' ? 'income' : 'expense';
  const spentOrReceivedCapital = capitalize(spentOrReceived);
  const duration = {start: first.timestampEpoch, end: last.timestampEpoch};
  const zero = AmountWithCurrency.zero(displayCurrency);
  const grossPerMonth = new MoneyTimeseries(
    displayCurrency,
    Granularity.MONTHLY
  );
  const netPerMonth = new MoneyTimeseries(displayCurrency, Granularity.MONTHLY);
  const grossPerCategory = new AppendMap<number, AmountWithCurrency>(
    AmountWithCurrency.add,
    zero
  );
  const netPerCategory = new AppendMap<number, AmountWithCurrency>(
    AmountWithCurrency.add,
    zero
  );
  const gross: AmountWithCurrency[] = [];
  const net: AmountWithCurrency[] = [];
  const failedToExchange: Transaction[] = [];
  for (const t of transactions) {
    const ts = startOfMonth(t.timestampEpoch);
    const g = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    const n = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    if (!g || !n) {
      failedToExchange.push(t);
      continue;
    }
    gross.push(g);
    net.push(n);
    netPerMonth.increment(ts, n);
    grossPerMonth.increment(ts, g);
    const cid = t.categoryId;
    grossPerCategory.increment(cid, g);
    netPerCategory.increment(cid, n);
  }
  const totalGross = gross.reduce((a, b) => a.add(b), zero);
  const totalNet = net.reduce((a, b) => a.add(b), zero);

  return (
    <div>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
      <div className="mb-2 ml-2 text-sm text-slate-600">
        <div>
          Total: {totalGross.round().format()}(gross) /{' '}
          {totalNet.round().format()}(net)
        </div>
        <div>
          Own share percent:{' '}
          {Math.round((100 * totalNet.cents()) / totalGross.cents())}%
        </div>
        <div>
          Monthly percentiles (gross):
          <div className="ml-1 text-xs">
            {percentile(grossPerMonth, 25).round().format()} (p25) /{' '}
            {percentile(grossPerMonth, 50).round().format()} (p50) /{' '}
            {percentile(grossPerMonth, 75).round().format()} (p75) /{' '}
            {percentile(grossPerMonth, 100).round().format()} (max)
          </div>
        </div>
        <div>
          Monthly percentiles (net):
          <div className="ml-1 text-xs">
            {percentile(netPerMonth, 25).round().format()} (p25) /{' '}
            {percentile(netPerMonth, 50).round().format()} (p50) /{' '}
            {percentile(netPerMonth, 75).round().format()} (p75) /{' '}
            {percentile(netPerMonth, 100).round().format()} (max)
          </div>
        </div>
      </div>
      <YearlyAllParties
        transactions={transactions}
        title={`Money ${spentOrReceived} gross (all parties)`}
        duration={duration}
      />
      <YearlyOwnShare
        transactions={transactions}
        title={`"Money ${spentOrReceived} net (own share)"`}
        duration={duration}
      />
      <MonthlyAllParties
        transactions={transactions}
        title={`"Money ${spentOrReceived} gross (all parties)"`}
        duration={duration}
      />
      <MonthlyOwnShare
        transactions={transactions}
        title={`"Money ${spentOrReceived} net (own share)"`}
        duration={duration}
      />
      <ChildCategoryFullAmountChart
        transactions={transactions}
        title={`"${spentOrReceivedCapital} by category gross (all parties)"`}
      />
      <ChildCategoryOwnShareChart
        transactions={transactions}
        title={`"${spentOrReceivedCapital} by category net (own share)"`}
      />
    </div>
  );
}

function ExenseStats({transactions}: {transactions: Transaction[]}) {
  const expenses = transactions.filter((t): t is Expense => isExpense(t));
  return <IncomeOrExenseStats transactions={expenses} />;
}

function IncomeStats({transactions}: {transactions: Transaction[]}) {
  const income = transactions.filter((t): t is Income => isIncome(t));
  return <IncomeOrExenseStats transactions={income} />;
}
