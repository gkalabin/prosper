"use client";
import {
  NotConfiguredYet,
  isFullyConfigured,
} from "components/NotConfiguredYet";
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
  SortableTransactionsList,
  SortingMode,
} from "components/transactions/SortableTransactionsList";
import { ButtonLink } from "components/ui/buttons";
import { addMonths, format, isSameMonth } from "date-fns";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { transactionIsDescendant } from "lib/model/Category";
import {
  Expense,
  Income,
  amountOwnShare,
  isExpense,
  isIncome,
} from "lib/model/Transaction";
import { TransactionsStatsInput } from "lib/stats/TransactionsStatsInput";
import { useState } from "react";
import Select from "react-select";

export function MonthsNavigationItem({
  m,
  active,
  showYear: forceShowYear,
  onClick,
}: {
  m: Date;
  active: Date;
  showYear?: boolean;
  onClick: (d: Date) => void;
}) {
  const isActive = isSameMonth(m, active);
  const monthOnly = format(m, "MMM");
  const monthAndYear = format(m, "MMM yyyy");
  if (isActive) {
    return <span className="font-medium text-slate-700">{monthAndYear}</span>;
  }
  const showYear = forceShowYear || monthOnly === "Jan" || monthOnly === "Dec";
  return (
    <ButtonLink onClick={() => onClick(m)}>
      {showYear ? monthAndYear : monthOnly}
    </ButtonLink>
  );
}

export function MonthsNavigation({
  months,
  active,
  setActive,
}: {
  months: Date[];
  active: Date;
  setActive: (d: Date) => void;
}) {
  const [leftMonthsCollapsed, setLeftMonthsCollapsed] = useState(true);
  const [rightMonthsCollapsed, setRightMonthsCollapsed] = useState(true);
  const [first, last] = [months[0], months[months.length - 1]];
  const monthIndex = months.findIndex((m) => m.getTime() === active.getTime());
  const windowMonths = 1;
  const displayMonths = months.slice(
    leftMonthsCollapsed ? Math.max(0, monthIndex - windowMonths) : 0,
    rightMonthsCollapsed
      ? Math.min(months.length, monthIndex + windowMonths + 1)
      : months.length,
  );
  const [firstDisplay, lastDisplay] = [
    displayMonths[0],
    displayMonths[displayMonths.length - 1],
  ];
  return (
    <>
      <div className="space-x-2">
        {!isSameMonth(first, firstDisplay) && (
          <>
            <MonthsNavigationItem
              m={first}
              active={active}
              onClick={setActive}
              showYear={true}
            />
            {!isSameMonth(addMonths(first, 1), firstDisplay) && (
              <ButtonLink onClick={() => setLeftMonthsCollapsed(false)}>
                &hellip;
              </ButtonLink>
            )}
          </>
        )}
        {displayMonths.map((m) => (
          <MonthsNavigationItem
            key={m.getTime()}
            m={m}
            active={active}
            onClick={setActive}
          />
        ))}
        {!isSameMonth(last, lastDisplay) && (
          <>
            {!isSameMonth(addMonths(last, -1), lastDisplay) && (
              <ButtonLink onClick={() => setRightMonthsCollapsed(false)}>
                &hellip;
              </ButtonLink>
            )}
            <MonthsNavigationItem
              m={last}
              active={active}
              onClick={setActive}
              showYear={true}
            />
          </>
        )}
      </div>
    </>
  );
}

export function MonthlyStats({ input }: { input: TransactionsStatsInput }) {
  const months = input.months();
  const [month, setMonth] = useState(months[months.length - 1]);
  const transactions = input
    .transactionsAllTime()
    .filter((t) => isSameMonth(month, t.timestampEpoch));
  const expenses = transactions.filter((t): t is Expense => isExpense(t));
  const income = transactions.filter((t): t is Income => isIncome(t));
  const displayCurrency = useDisplayCurrency();
  const { bankAccounts, stocks, exchange } = useAllDatabaseDataContext();
  const totalExpense = expenses
    .map((t) =>
      amountOwnShare(t, displayCurrency, bankAccounts, stocks, exchange),
    )
    .reduce((p, c) => c.add(p));
  const totalIncome = income
    .map((t) =>
      amountOwnShare(t, displayCurrency, bankAccounts, stocks, exchange),
    )
    .reduce((p, c) => c.add(p));

  const expenseIncomeRatio = totalIncome.isZero()
    ? Infinity
    : totalExpense.dollar() / totalIncome.dollar();

  return (
    <>
      <div>
        <div className="my-3">
          <MonthsNavigation
            months={months}
            active={month}
            setActive={setMonth}
          />
        </div>
        <div className="space-y-4">
          <ul className="text-lg">
            <li>Spent: {totalExpense.round().format()}</li>
            <li>Received: {totalIncome.round().format()}</li>
            <li>
              Delta: {totalIncome.subtract(totalExpense).round().format()}
            </li>
            <li>Spent/received: {Math.round(expenseIncomeRatio * 100)}%</li>
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
            <VendorStats input={input} month={month} />
          </div>
        </div>
      </div>
    </>
  );
}

export function VendorStats({
  input,
  month,
}: {
  input: TransactionsStatsInput;
  month: Date;
}) {
  const transactions = input
    .transactionsAllTime()
    .filter((t) => isSameMonth(month, t.timestampEpoch));
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

function NonEmptyPageContent() {
  const { transactions, categories, displaySettings } =
    useAllDatabaseDataContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats(),
  );
  const categoryOptions = categories.map((a) => ({
    value: a.id(),
    label: a.nameWithAncestors(),
  }));
  const filteredTransactions = transactions.filter(
    (t) =>
      !excludeCategories.some((cid) =>
        transactionIsDescendant(t, cid, categories),
      ),
  );
  const durations = transactions
    .map((t) => t.timestampEpoch)
    .sort((a, b) => a - b);
  const input = new TransactionsStatsInput(filteredTransactions, {
    start: durations[0],
    end: durations[durations.length - 1],
  });
  return (
    <>
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
      <MonthlyStats input={input} />
    </>
  );
}

export function MonthlyStatsPage({ dbData }: { dbData: AllDatabaseData }) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
