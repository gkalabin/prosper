import {CurrencyExchangeFailed} from '@/app/(authenticated)/stats/CurrencyExchangeFailed';
import {useExchangedIntervalTransactions} from '@/app/(authenticated)/stats/modelHelpers';
import {ExpenseByTopCategoryChart} from '@/components/charts/aggregate/ExpenseByTopCategory';
import {MonthlyTransactionCount} from '@/components/charts/timeseries/MonthlyTransactionCount';
import {TimelineAmountsChart} from '@/components/charts/timeseries/TimelineAmountsChart';
import {Button} from '@/components/ui/button';
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
import {useId} from 'react';

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
      <div className="col-span-6">
        <MonthlyTransactionCount input={input} />
        <IncomeOrExenseSection kind={'expense'} input={input} />
        <IncomeOrExenseSection kind={'income'} input={input} />
      </div>
      <div className="col-span-6">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
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

function IncomeOrExenseSection({
  input,
  kind,
}: {
  input: ExchangedIntervalTransactions;
  kind: 'expense' | 'income';
}) {
  const incomeOrExpenseCapital = capitalize(kind);
  const titleId = useId();
  const transactions = kind == 'expense' ? input.expenses() : input.income();
  if (!transactions.length) {
    return <></>;
  }
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="mb-1 mt-4 text-xl font-medium leading-7">
        {incomeOrExpenseCapital}
      </h2>
      <IncomeOrExenseStats kind={kind} input={input} />
    </section>
  );
}

function IncomeOrExenseStats({
  input,
  kind,
}: {
  input: ExchangedIntervalTransactions;
  kind: 'expense' | 'income';
}) {
  const spentOrReceived = kind == 'income' ? 'received' : 'spent';
  const incomeOrExpenseCapital = capitalize(kind);
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
  const transactions = kind == 'expense' ? input.expenses() : input.income();
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
          Total: {totalGross.round().format()} (gross) /{' '}
          {totalNet.round().format()} (net)
        </div>
        <div>
          Own share percent:{' '}
          {Math.round((100 * totalNet.cents()) / totalGross.cents())}%
        </div>
        <Percentiles
          label="Monthly percentiles (gross)"
          timeseries={grossPerMonth}
        />
        <Percentiles
          label="Monthly percentiles (net)"
          timeseries={netPerMonth}
        />
      </div>
      <TimelineAmountsChart
        title={`Yearly ${spentOrReceived} gross (all parties)`}
        granularity={Granularity.YEARLY}
        data={transactions.map(({t, allParties}) => ({
          timestamp: t.timestampEpoch,
          amount: allParties,
        }))}
        timeline={input.interval()}
        currency={input.currency()}
      />
      <TimelineAmountsChart
        title={`Yearly ${spentOrReceived} net (own share)`}
        granularity={Granularity.YEARLY}
        data={transactions.map(({t, ownShare}) => ({
          timestamp: t.timestampEpoch,
          amount: ownShare,
        }))}
        timeline={input.interval()}
        currency={input.currency()}
      />
      <TimelineAmountsChart
        title={`Monthly ${spentOrReceived} gross (all parties)`}
        granularity={Granularity.MONTHLY}
        data={transactions.map(({t, allParties}) => ({
          timestamp: t.timestampEpoch,
          amount: allParties,
        }))}
        timeline={input.interval()}
        currency={input.currency()}
      />
      <TimelineAmountsChart
        title={`Monthly ${spentOrReceived} net (own share)`}
        granularity={Granularity.MONTHLY}
        data={transactions.map(({t, ownShare}) => ({
          timestamp: t.timestampEpoch,
          amount: ownShare,
        }))}
        timeline={input.interval()}
        currency={input.currency()}
      />
      <ExpenseByTopCategoryChart
        title={`${incomeOrExpenseCapital} by top level category net (own share)`}
        currency={input.currency()}
        data={transactions}
      />
    </div>
  );
}

function Percentiles({
  label,
  timeseries,
}: {
  label: string;
  timeseries: MoneyTimeseries;
}) {
  const labelId = useId();
  const items = [
    {id: useId(), label: 'p25', value: percentile(timeseries, 25)},
    {id: useId(), label: 'p50', value: percentile(timeseries, 50)},
    {id: useId(), label: 'p75', value: percentile(timeseries, 75)},
    {id: useId(), label: 'max', value: percentile(timeseries, 100)},
  ];
  return (
    <section aria-labelledby={labelId}>
      <h3 id={labelId} className="font-medium">
        {label}
      </h3>
      <ul className="my-1 ml-2 gap-3 text-xs">
        {items.map(({id, label, value}) => (
          <li key={id}>
            {label}:
            <span className="text-mono ml-2">{value.round().format()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
