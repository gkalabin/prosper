import {CurrencyExchangeFailed} from '@/app/(authenticated)/stats/CurrencyExchangeFailed';
import {useExchangedIntervalTransactions} from '@/app/(authenticated)/stats/modelHelpers';
import {ExpenseByTopCategoryChart} from '@/components/charts/aggregate/ExpenseByTopCategory';
import {MonthlyTransactionCount} from '@/components/charts/timeseries/MonthlyTransactionCount';
import {TimelineAmountsChart} from '@/components/charts/timeseries/TimelineAmountsChart';
import {ButtonFormSecondary} from '@/components/ui/buttons';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {ExchangedIntervalTransactions} from '@/lib/ExchangedTransactions';
import {
  Transaction,
  isPersonalExpense,
  isThirdPartyExpense,
} from '@/lib/model/transaction/Transaction';
import {Granularity} from '@/lib/util/Granularity';
import {MoneyTimeseries, percentile} from '@/lib/util/Timeseries';
import {capitalize} from '@/lib/util/util';
import {differenceInMonths} from 'date-fns';

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
  const sorted = [...transactions].sort(
    (a, b) => a.timestampEpoch - b.timestampEpoch
  );
  const [first, last] = [sorted[0], sorted[sorted.length - 1]];
  const duration = {start: first.timestampEpoch, end: last.timestampEpoch};
  const {input, failed} = useExchangedIntervalTransactions(sorted, duration);
  return (
    <>
      <CurrencyExchangeFailed failedTransactions={failed} />
      <TextSummary input={input} />
      <Charts input={input} />
      <div className="col-span-6">
        <ButtonFormSecondary onClick={onClose}>Close</ButtonFormSecondary>
      </div>
    </>
  );
}

function TextSummary({input}: {input: ExchangedIntervalTransactions}) {
  return (
    <section className="col-span-6">
      Matched {input.transactions().length} transactions over the last{' '}
      {differenceInMonths(input.interval().end, input.interval().start)} months
      <div className="ml-2 text-sm text-slate-600">
        <div>
          Personal:{' '}
          {input.expenses().filter(({t}) => isPersonalExpense(t)).length}
        </div>
        <div>
          External:{' '}
          {input.expenses().filter(({t}) => isThirdPartyExpense(t)).length}
        </div>
        <div>Transfers: {input.transfers().length}</div>
        <div>Income: {input.income().length}</div>
        <div>First: {new Date(input.interval().start).toISOString()}</div>
        <div>Last: {new Date(input.interval().end).toISOString()}</div>
      </div>
    </section>
  );
}

function Charts({input}: {input: ExchangedIntervalTransactions}) {
  return (
    <div className="col-span-6">
      <MonthlyTransactionCount input={input} />
      <h1 className="mb-1 mt-4 text-xl font-medium leading-7">Expenses</h1>
      <IncomeOrExenseStats kind={'expense'} input={input} />
      <h1 className="mb-1 mt-4 text-xl font-medium leading-7">Income</h1>
      <IncomeOrExenseStats kind={'income'} input={input} />
    </div>
  );
}

function IncomeOrExenseStats({
  input,
  kind,
}: {
  input: ExchangedIntervalTransactions;
  kind: 'expense' | 'income';
}) {
  const transactions = kind == 'expense' ? input.expenses() : input.income();
  if (!transactions.length) {
    return <></>;
  }
  const spentOrReceived = kind == 'income' ? 'income' : 'expense';
  const spentOrReceivedCapital = capitalize(spentOrReceived);
  let totalGross = AmountWithCurrency.zero(input.currency());
  let totalNet = AmountWithCurrency.zero(input.currency());
  const grossPerMonth = new MoneyTimeseries(
    input.currency(),
    Granularity.MONTHLY
  );
  const netPerMonth = new MoneyTimeseries(
    input.currency(),
    Granularity.MONTHLY
  );
  for (const {t, ownShare, allParties} of transactions) {
    totalNet = totalNet.add(ownShare);
    netPerMonth.increment(t.timestampEpoch, ownShare);
    totalGross = totalGross.add(allParties);
    grossPerMonth.increment(t.timestampEpoch, allParties);
  }
  return (
    <div>
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
      <TimelineAmountsChart
        title={`Money ${spentOrReceived} gross (all parties)`}
        granularity={Granularity.YEARLY}
        data={transactions.map(({t, allParties}) => ({
          timestamp: t.timestampEpoch,
          amount: allParties,
        }))}
        timeline={input.interval()}
        currency={input.currency()}
      />
      <TimelineAmountsChart
        title={`Money ${spentOrReceived} net (own share)`}
        granularity={Granularity.YEARLY}
        data={transactions.map(({t, ownShare}) => ({
          timestamp: t.timestampEpoch,
          amount: ownShare,
        }))}
        timeline={input.interval()}
        currency={input.currency()}
      />
      <TimelineAmountsChart
        title={`Money ${spentOrReceived} gross (all parties)`}
        granularity={Granularity.MONTHLY}
        data={transactions.map(({t, allParties}) => ({
          timestamp: t.timestampEpoch,
          amount: allParties,
        }))}
        timeline={input.interval()}
        currency={input.currency()}
      />
      <TimelineAmountsChart
        title={`Money ${spentOrReceived} net (own share)`}
        granularity={Granularity.MONTHLY}
        data={transactions.map(({t, ownShare}) => ({
          timestamp: t.timestampEpoch,
          amount: ownShare,
        }))}
        timeline={input.interval()}
        currency={input.currency()}
      />
      <ExpenseByTopCategoryChart
        title={`${spentOrReceivedCapital} by top level category net (own share)`}
        currency={input.currency()}
        data={transactions}
      />
    </div>
  );
}
