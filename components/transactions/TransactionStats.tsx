import {
  ChildCategoryFullAmountChart,
  ChildCategoryOwnShareChart,
} from "components/charts/CategoryPie";
import {
  MonthlyAllParties,
  MonthlyOwnShare,
} from "components/charts/MonthlySum";
import { TransactionFrequencyChart } from "components/charts/TransactionFrequency";
import { YearlyAllParties, YearlyOwnShare } from "components/charts/YearlySum";
import { ButtonFormSecondary } from "components/ui/buttons";
import { differenceInMonths, startOfMonth } from "date-fns";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import {
  Expense,
  Income,
  Transaction,
  amountAllParties,
  amountOwnShare,
  isExpense,
  isIncome,
  isPersonalExpense,
  isThirdPartyExpense,
  isTransfer,
} from "lib/model/Transaction";
import { AppendMap } from "lib/util/AppendingMap";
import { MoneyTimeseries } from "lib/util/Timeseries";

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

function TextSummary({ transactions }: { transactions: Transaction[] }) {
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  return (
    <div className="col-span-6">
      Matched {transactions.length} transations over the last{" "}
      {differenceInMonths(last.timestampEpoch, first.timestampEpoch)} months
      <div className="ml-2 text-sm text-slate-600">
        <div>
          Personal: {transactions.filter((t) => isPersonalExpense(t)).length}
        </div>
        <div>
          External: {transactions.filter((t) => isThirdPartyExpense(t)).length}
        </div>
        <div>Transfers: {transactions.filter((t) => isTransfer(t)).length}</div>
        <div>Income: {transactions.filter((t) => isIncome(t)).length}</div>
        <div>First: {new Date(first.timestampEpoch).toISOString()}</div>
        <div>Last: {new Date(last.timestampEpoch).toISOString()}</div>
      </div>
    </div>
  );
}

function Charts({ transactions }: { transactions: Transaction[] }) {
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  const duration = { start: first.timestampEpoch, end: last.timestampEpoch };
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
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const expenses = transactions.filter((t): t is Expense => isExpense(t));
  if (!expenses.length) {
    return <></>;
  }
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  const duration = { start: first.timestampEpoch, end: last.timestampEpoch };
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
  for (const t of expenses) {
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
    gross.push(g);
    net.push(n);
    netPerMonth.append(ts, n);
    grossPerMonth.append(ts, g);
    const cid = t.categoryId;
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
      <YearlyAllParties
        transactions={expenses}
        title="Money spent gross (all parties)"
        duration={duration}
      />
      <YearlyOwnShare
        transactions={expenses}
        title="Money spent net (own share)"
        duration={duration}
      />
      <MonthlyAllParties
        transactions={expenses}
        title="Money spent gross (all parties)"
        duration={duration}
      />
      <MonthlyOwnShare
        transactions={expenses}
        title="Money spent net (own share)"
        duration={duration}
      />
      <ChildCategoryFullAmountChart
        transactions={expenses}
        title="Expenses by category gross (all parties)"
      />
      <ChildCategoryOwnShareChart
        transactions={expenses}
        title="Expenses by category net (own share)"
      />
    </div>
  );
}

function IncomeStats({ transactions }: { transactions: Transaction[] }) {
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const incomeTransactions = transactions.filter((t): t is Income =>
    isIncome(t)
  );
  if (!incomeTransactions.length) {
    return <></>;
  }
  const [first, last] = [
    transactions[0],
    transactions[transactions.length - 1],
  ];
  const duration = { start: first.timestampEpoch, end: last.timestampEpoch };
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
  for (const t of incomeTransactions) {
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
    gross.push(g);
    net.push(n);
    netPerMonth.append(ts, n);
    grossPerMonth.append(ts, g);
    const cid = t.categoryId;
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
      <MonthlyAllParties
        transactions={incomeTransactions}
        title="Money received gross (all parties)"
        duration={duration}
      />
      <MonthlyOwnShare
        transactions={incomeTransactions}
        title="Money received net (own share)"
        duration={duration}
      />
      <YearlyAllParties
        transactions={incomeTransactions}
        title="Money received gross (all parties)"
        duration={duration}
      />
      <YearlyOwnShare
        transactions={incomeTransactions}
        title="Money received net (own share)"
        duration={duration}
      />
      <ChildCategoryFullAmountChart
        transactions={incomeTransactions}
        title="Income by category gross (all parties)"
      />
      <ChildCategoryOwnShareChart
        transactions={incomeTransactions}
        title="Income by category net (own share)"
      />
    </div>
  );
}
