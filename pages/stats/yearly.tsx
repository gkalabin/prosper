import {
  ChildCategoryOwnShareChart,
  TopLevelCategoryOwnShareChart,
} from "components/charts/CategoryPie";
import {
  TopNVendorsMostSpent,
  TopNVendorsMostTransactions,
} from "components/charts/Vendor";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  isFullyConfigured,
  NotConfiguredYet,
} from "components/NotConfiguredYet";
import { StatsPageLayout } from "components/StatsPageLayout";
import {
  SortableTransactionsList,
  SortingMode,
} from "components/transactions/SortableTransactionsList";
import { ButtonLink } from "components/ui/buttons";
import { format, isSameYear } from "date-fns";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { transactionIsDescendant } from "lib/model/Category";
import {
  amountOwnShare,
  Expense,
  Income,
  isExpense,
  isIncome,
} from "lib/model/Transaction";
import { allDbDataProps } from "lib/ServerSideDB";
import { TransactionsStatsInput } from "lib/stats/TransactionsStatsInput";
import { InferGetServerSidePropsType } from "next";
import { useState } from "react";
import Select from "react-select";

function Navigation({
  years,
  active,
  setActive,
}: {
  years: Date[];
  active: Date;
  setActive: (d: Date) => void;
}) {
  return (
    <>
      <div className="space-x-2">
        {years.map((y) => (
          <span key={y.getTime()}>
            {(isSameYear(active, y) && (
              <span className="font-medium text-slate-700">
                {format(y, "yyyy")}
              </span>
            )) || (
              <ButtonLink onClick={() => setActive(y)}>
                {format(y, "yyyy")}
              </ButtonLink>
            )}
          </span>
        ))}
      </div>
    </>
  );
}

export function VendorStats({
  input,
  year,
}: {
  input: TransactionsStatsInput;
  year: Date;
}) {
  const transactions = input
    .transactionsAllTime()
    .filter((t) => isSameYear(year, t.timestampEpoch));
  const expenses = transactions.filter((t): t is Expense => isExpense(t));
  return (
    <div>
      <h1 className="text-xl font-medium leading-7">Vendors</h1>
      <TopNVendorsMostSpent transactions={expenses} title="Most spent" n={10} />
      <TopNVendorsMostTransactions
        transactions={expenses}
        title="Most transactions"
        n={10}
      />
    </div>
  );
}

export function YearlyStats({ input }: { input: TransactionsStatsInput }) {
  const years = input.years();
  const [year, setYear] = useState(years[years.length - 1]);
  const transactions = input
    .transactionsAllTime()
    .filter((t) => isSameYear(year, t.timestampEpoch));
  const expenses = transactions.filter((t): t is Expense => isExpense(t));
  const income = transactions.filter((t): t is Income => isIncome(t));
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const zero = AmountWithCurrency.zero(displayCurrency);
  const totalExpense = expenses
    .map((t) =>
      amountOwnShare(t, displayCurrency, bankAccounts, stocks, exchange)
    )
    .reduce((p, c) => c.add(p), zero);
  const totalIncome = income
    .map((t) =>
      amountOwnShare(t, displayCurrency, bankAccounts, stocks, exchange)
    )
    .reduce((p, c) => c.add(p), zero);
  const expenseIncomeRatio = totalIncome.isZero()
    ? Infinity
    : totalExpense.dollar() / totalIncome.dollar();
  const tripsTotal = expenses
    .filter((t) => t.tripId)
    .map((t) =>
      amountOwnShare(t, displayCurrency, bankAccounts, stocks, exchange)
    )
    .reduce((p, c) => c.add(p), zero);

  return (
    <>
      <div>
        <div className="my-3">
          <Navigation years={years} active={year} setActive={setYear} />
        </div>
        <div className="space-y-4">
          <ul className="text-lg">
            <li>Spent: {totalExpense.round().format()}</li>
            <li>Received: {totalIncome.round().format()}</li>
            <li>
              Delta: {totalIncome.subtract(totalExpense).round().format()}
            </li>
            <li>Spent/received: {Math.round(expenseIncomeRatio * 100)}%</li>
            <li>Trips: {tripsTotal.round().format()}</li>
          </ul>

          <div>
            <h1 className="text-xl font-medium leading-7">
              Expenses ({expenses.length})
            </h1>
            <TopLevelCategoryOwnShareChart
              title="Top level category"
              transactions={expenses}
            />
            <ChildCategoryOwnShareChart
              title="Transaction category"
              transactions={expenses}
            />
            <SortableTransactionsList
              transactions={expenses}
              initialSorting={SortingMode.AMOUNT_DESC}
            />
          </div>

          <div>
            <h1 className="text-xl font-medium leading-7">
              Income ({income.length})
            </h1>
            <ChildCategoryOwnShareChart
              title="Income category"
              transactions={income}
            />
            <SortableTransactionsList
              transactions={income}
              initialSorting={SortingMode.AMOUNT_DESC}
            />
          </div>

          <div>
            <VendorStats input={input} year={year} />
          </div>
        </div>
      </div>
    </>
  );
}

function PageContent() {
  const { transactions, categories, displaySettings } =
    useAllDatabaseDataContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats()
  );
  const categoryOptions = categories.map((a) => ({
    value: a.id(),
    label: a.nameWithAncestors(),
  }));
  const filteredTransactions = transactions.filter(
    (t) =>
      !excludeCategories.some((cid) =>
        transactionIsDescendant(t, cid, categories)
      )
  );
  const durations = transactions
    .map((t) => t.timestampEpoch)
    .sort((a, b) => a - b);
  const input = new TransactionsStatsInput(filteredTransactions, {
    start: durations[0],
    end: durations[durations.length - 1],
  });
  return (
    <StatsPageLayout>
      <div className="mb-4">
        <label
          htmlFor="categoryIds"
          className="block text-sm font-medium text-gray-700"
        >
          Categories to exclude
        </label>
        <Select
          instanceId={"categoryIds"}
          styles={undoTailwindInputStyles()}
          options={categoryOptions}
          isMulti
          value={excludeCategories.map((x) => ({
            label: categoryOptions.find((c) => c.value == x).label,
            value: x,
          }))}
          onChange={(x) => setExcludeCategories(x.map((x) => x.value))}
        />
      </div>
      <YearlyStats input={input} />
    </StatsPageLayout>
  );
}

export const getServerSideProps = allDbDataProps;
export default function MaybeEmptyPage(
  dbData: InferGetServerSidePropsType<typeof getServerSideProps>
) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <PageContent />
    </AllDatabaseDataContextProvider>
  );
}
