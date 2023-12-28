import { MonthlyOwnShare } from "components/charts/MonthlySum";
import { TransactionFrequencyChart } from "components/charts/TransactionFrequency";
import { ButtonFormSecondary } from "components/ui/buttons";
import {
  differenceInMonths,
  eachMonthOfInterval,
  startOfMonth,
} from "date-fns";
import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { defaultMoneyChartOptions, defaultPieChartOptions } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";
import { AppendMap } from "lib/util/AppendingMap";
import { MoneyTimeseries } from "lib/util/Timeseries";

export function TransactionStats(props: {
  onClose: () => void;
  transactions: Transaction[];
}) {
  const transactionsByTimestamp = [...props.transactions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
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

function TextSummary({ transactions }: { transactions: Transaction[] }) {
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  return (
    <div className="col-span-6">
      Matched {transactions.length} transations over the last{" "}
      {differenceInMonths(last.timestamp, first.timestamp)} months
      <div className="ml-2 text-sm text-slate-600">
        <div>
          Personal: {transactions.filter((t) => t.isPersonalExpense()).length}
        </div>
        <div>
          External: {transactions.filter((t) => t.isThirdPartyExpense()).length}
        </div>
        <div>
          Transfers: {transactions.filter((t) => t.isTransfer()).length}
        </div>
        <div>Income: {transactions.filter((t) => t.isIncome()).length}</div>
        <div>First: {first.timestamp.toISOString()}</div>
        <div>Last: {last.timestamp.toISOString()}</div>
      </div>
    </div>
  );
}

function Charts({ transactions }: { transactions: Transaction[] }) {
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  const duration = { start: first.timestamp, end: last.timestamp };
  return (
    <div className="col-span-6">
      <TransactionFrequencyChart
        duration={duration}
        transactions={transactions}
      />
      <h1 className="mt-4 mb-1 text-xl font-medium leading-7">Expenses</h1>
      <ExenseStats transactions={transactions} />
      <h1 className="mt-4 mb-1 text-xl font-medium leading-7">Income</h1>
      <IncomeStats transactions={transactions} />
    </div>
  );
}

function ExenseStats({ transactions }: { transactions: Transaction[] }) {
  const displayCurrency = useDisplayCurrency();
  const { categories } = useAllDatabaseDataContext();
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  const duration = { start: first.timestamp, end: last.timestamp };
  const months = eachMonthOfInterval(duration).map((x) => x.getTime());
  const zero = AmountWithCurrency.zero(displayCurrency);
  const grossPerMonth = new MoneyTimeseries(displayCurrency);
  const netPerMonth = new MoneyTimeseries(displayCurrency);
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
  const expenses = transactions.filter(
    (t) => t.isPersonalExpense() || t.isThirdPartyExpense()
  );
  for (const t of expenses) {
    const ts = startOfMonth(t.timestamp);
    const g = t.amountAllParties(displayCurrency);
    const n = t.amountOwnShare(displayCurrency);
    gross.push(g);
    net.push(n);
    netPerMonth.append(ts, n);
    grossPerMonth.append(ts, g);
    const cid = t.category.id();
    grossPerCategory.append(cid, g);
    netPerCategory.append(cid, n);
  }
  const totalGross = gross.reduce((a, b) => a.add(b), zero);
  const totalNet = net.reduce((a, b) => a.add(b), zero);

  return (
    <div>
      <div className="ml-2 mb-2 text-sm text-slate-600">
        <div>
          Total: {totalGross.round().format()}(gross) /{" "}
          {totalNet.round().format()}(net)
        </div>
        <div>
          Own share percent:{" "}
          {Math.round((100 * totalNet.cents()) / totalGross.cents())}%
        </div>
        <div>
          Monthly percentiles (gross):
          <div className="ml-1 text-xs">
            {grossPerMonth.monthlyPercentile(25).round().format()} (p25) /{" "}
            {grossPerMonth.monthlyPercentile(50).round().format()} (p50) /{" "}
            {grossPerMonth.monthlyPercentile(75).round().format()} (p75) /{" "}
            {grossPerMonth.monthlyPercentile(100).round().format()} (max)
          </div>
        </div>
        <div>
          Monthly percentiles (net):
          <div className="ml-1 text-xs">
            {netPerMonth.monthlyPercentile(25).round().format()} (p25) /{" "}
            {netPerMonth.monthlyPercentile(50).round().format()} (p50) /{" "}
            {netPerMonth.monthlyPercentile(75).round().format()} (p75) /{" "}
            {netPerMonth.monthlyPercentile(100).round().format()} (max)
          </div>
        </div>
      </div>
      <ReactEcharts
        notMerge
        option={{
          ...defaultMoneyChartOptions(displayCurrency, months),
          title: {
            text: "Money spent (gross: all parties)",
          },
          series: [
            {
              type: "bar",
              data: grossPerMonth.monthRoundDollars(months),
            },
          ],
        }}
      />
      <MonthlyOwnShare
        transactions={expenses}
        duration={duration}
        title="Total spent (own share)"
      />

      <ReactEcharts
        notMerge
        option={{
          ...defaultPieChartOptions(),
          title: {
            text: "By category (gross)",
          },
          series: [
            {
              type: "pie",
              data: [...grossPerCategory.entries()].map(([cid, amount]) => ({
                name: categories.find((c) => c.id() == cid).nameWithAncestors(),
                value: amount.dollar(),
              })),
            },
          ],
        }}
      />
      <ReactEcharts
        notMerge
        option={{
          ...defaultPieChartOptions(),
          title: {
            text: "By category (net)",
          },
          series: [
            {
              type: "pie",
              data: [...netPerCategory.entries()].map(([cid, amount]) => ({
                name: categories.find((c) => c.id() == cid).nameWithAncestors(),
                value: amount.dollar(),
              })),
            },
          ],
        }}
      />
    </div>
  );
}

function IncomeStats({ transactions }: { transactions: Transaction[] }) {
  const displayCurrency = useDisplayCurrency();
  const { categories } = useAllDatabaseDataContext();
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  const duration = { start: first.timestamp, end: last.timestamp };
  const months = eachMonthOfInterval(duration).map((x) => x.getTime());
  const zero = AmountWithCurrency.zero(displayCurrency);
  const grossPerMonth = new MoneyTimeseries(displayCurrency);
  const netPerMonth = new MoneyTimeseries(displayCurrency);
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
  for (const t of transactions) {
    const ts = startOfMonth(t.timestamp);
    if (t.isIncome()) {
      const g = t.amountAllParties(displayCurrency);
      const n = t.amountOwnShare(displayCurrency);
      gross.push(g);
      net.push(n);
      netPerMonth.append(ts, n);
      grossPerMonth.append(ts, g);
      const cid = t.category.id();
      grossPerCategory.append(cid, g);
      netPerCategory.append(cid, n);
    }
  }
  const totalGross = gross.reduce((a, b) => a.add(b), zero);
  const totalNet = net.reduce((a, b) => a.add(b), zero);

  return (
    <div>
      <div className="ml-2 mb-2 text-sm text-slate-600">
        <div>
          Total: {totalGross.round().format()}(gross) /{" "}
          {totalNet.round().format()}(net)
        </div>
        <div>
          Own share percent:{" "}
          {Math.round((100 * totalNet.cents()) / totalGross.cents())}%
        </div>
        <div>
          Monthly percentiles (gross):
          <div className="ml-1 text-xs">
            {grossPerMonth.monthlyPercentile(25).round().format()} (p25) /{" "}
            {grossPerMonth.monthlyPercentile(50).round().format()} (p50) /{" "}
            {grossPerMonth.monthlyPercentile(75).round().format()} (p75) /{" "}
            {grossPerMonth.monthlyPercentile(100).round().format()} (max)
          </div>
        </div>
        <div>
          Monthly percentiles (net):
          <div className="ml-1 text-xs">
            {netPerMonth.monthlyPercentile(25).round().format()} (p25) /{" "}
            {netPerMonth.monthlyPercentile(50).round().format()} (p50) /{" "}
            {netPerMonth.monthlyPercentile(75).round().format()} (p75) /{" "}
            {netPerMonth.monthlyPercentile(100).round().format()} (max)
          </div>
        </div>
      </div>
      <ReactEcharts
        notMerge
        option={{
          ...defaultMoneyChartOptions(displayCurrency, months),
          title: {
            text: "Money received (gross: all parties)",
          },
          series: [
            {
              type: "bar",
              data: grossPerMonth.monthRoundDollars(months),
            },
          ],
        }}
      />
      <ReactEcharts
        notMerge
        option={{
          ...defaultMoneyChartOptions(displayCurrency, months),
          title: {
            text: "Money received (net: own share)",
          },
          series: [
            {
              type: "bar",
              data: grossPerMonth.monthRoundDollars(months),
            },
          ],
        }}
      />

      <ReactEcharts
        notMerge
        option={{
          ...defaultPieChartOptions(),
          title: {
            text: "Income by category (gross)",
          },
          series: [
            {
              type: "pie",
              data: [...grossPerCategory.entries()].map(([cid, amount]) => ({
                name: categories.find((c) => c.id() == cid).nameWithAncestors(),
                value: amount.dollar(),
              })),
            },
          ],
        }}
      />
      <ReactEcharts
        notMerge
        option={{
          ...defaultPieChartOptions(),
          title: {
            text: "Income by category (net)",
          },
          series: [
            {
              type: "pie",
              data: [...netPerCategory.entries()].map(([cid, amount]) => ({
                name: categories.find((c) => c.id() == cid).nameWithAncestors(),
                value: amount.dollar(),
              })),
            },
          ],
        }}
      />
    </div>
  );
}
