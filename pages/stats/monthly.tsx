import {
  NotConfiguredYet,
  isFullyConfigured,
} from "components/NotConfiguredYet";
import { StatsPageLayout } from "components/StatsPageLayout";
import {
  ChildCategoryOwnShareChart,
  TopLevelCategoryOwnShareChart,
} from "components/charts/CategoryPie";
import { undoTailwindInputStyles } from "components/forms/Select";
import {
  SortableTransactionsList,
  SortingMode,
} from "components/transactions/SortableTransactionsList";
import { ButtonLink } from "components/ui/buttons";
import { addMonths, format, isSameMonth } from "date-fns";
import ReactEcharts from "echarts-for-react";
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from "lib/ClientSideModel";
import { allDbDataProps } from "lib/ServerSideDB";
import { useDisplayCurrency } from "lib/displaySettings";
import { TransactionsStatsInput } from "lib/stats/TransactionsStatsInput";
import { AppendMap, currencyAppendMap } from "lib/util/AppendingMap";
import { topN } from "lib/util/util";
import { InferGetServerSidePropsType } from "next";
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
      : months.length
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
    .filter((t) => isSameMonth(month, t.timestamp));
  const expenses = transactions.filter(
    (t) => t.isPersonalExpense() || t.isThirdPartyExpense()
  );
  const income = transactions.filter((t) => t.isIncome());
  const displayCurrency = useDisplayCurrency();
  const totalExpense = expenses
    .map((t) => t.amountOwnShare(displayCurrency))
    .reduce((p, c) => c.add(p));
  const totalIncome = income
    .map((t) => t.amountOwnShare(displayCurrency))
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
    .filter((t) => isSameMonth(month, t.timestamp));
  const expenses = transactions.filter(
    (t) => t.isPersonalExpense() || t.isThirdPartyExpense()
  );
  const displayCurrency = useDisplayCurrency();
  const sum = currencyAppendMap<string>(displayCurrency);
  const count = new AppendMap<string, number>((a, b) => a + b, 0);
  for (const t of expenses) {
    sum.append(t.vendor(), t.amountOwnShare(displayCurrency));
    count.append(t.vendor(), 1);
  }
  const topSum = topN(sum, 10, (x) => `Other ${x} vendors`);

  const vendorsByCount = Array.from(count.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div>
      <h1 className="text-xl font-medium leading-7">Vendors</h1>
      <ReactEcharts
        notMerge
        option={{
          grid: {
            containLabel: true,
          },
          tooltip: {},
          xAxis: {
            data: topSum.map(([vendor]) => vendor),
          },
          yAxis: {},
          title: {
            text: "Most paid",
          },
          series: [
            {
              type: "bar",
              data: topSum.map(([_, sum]) => sum.round().dollar()),
            },
          ],
        }}
      />
      <ReactEcharts
        notMerge
        option={{
          grid: {
            containLabel: true,
          },
          tooltip: {},
          xAxis: {
            data: vendorsByCount.map(([vendor]) => vendor),
          },
          yAxis: {},
          title: {
            text: "Most transactions",
          },
          series: [
            {
              type: "bar",
              data: vendorsByCount.map(([_, sum]) => sum),
            },
          ],
        }}
      />
    </div>
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
    (t) => !excludeCategories.includes(t.category.id())
  );
  const durations = transactions
    .map((t) => t.timestamp)
    .sort((a, b) => a.getTime() - b.getTime());
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
      <MonthlyStats input={input} />
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
