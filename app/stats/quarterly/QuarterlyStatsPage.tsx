'use client';
import {CurrencyExchangeFailed} from 'app/stats/CurrencyExchangeFailed';
import {ExcludedCategoriesSelector} from 'app/stats/ExcludedCategoriesSelector';
import {useStatsPageProps} from 'app/stats/modelHelpers';
import {NotConfiguredYet, isFullyConfigured} from 'components/NotConfiguredYet';
import {
  ChildCategoryOwnShareChart,
  TopLevelCategoryOwnShareChart,
} from 'components/charts/CategoryPie';
import {
  TopNVendorsMostSpent,
  TopNVendorsMostTransactions,
} from 'components/charts/Vendor';
import {
  SortableTransactionsList,
  SortingMode,
} from 'components/transactions/SortableTransactionsList';
import {ButtonLink} from 'components/ui/buttons';
import {
  eachQuarterOfInterval,
  endOfQuarter,
  format,
  isSameQuarter,
  startOfQuarter,
} from 'date-fns';
import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {
  AllDatabaseDataContextProvider,
  useAllDatabaseDataContext,
} from 'lib/context/AllDatabaseDataContext';
import {
  useDisplayCurrency,
  useDisplaySettingsContext,
} from 'lib/context/DisplaySettingsContext';
import {AllDatabaseData} from 'lib/model/AllDatabaseDataModel';
import {Income} from 'lib/model/transaction/Income';
import {Expense, isExpense, isIncome} from 'lib/model/transaction/Transaction';
import {TransactionsStatsInput} from 'lib/stats/TransactionsStatsInput';
import {useState} from 'react';

function Navigation({
  quarters,
  active,
  setActive,
}: {
  quarters: Date[];
  active: Date;
  setActive: (d: Date) => void;
}) {
  return (
    <>
      <div className="space-x-2">
        {quarters.map(y => (
          <span key={y.getTime()}>
            {(isSameQuarter(active, y) && (
              <span className="font-medium text-slate-700">
                {format(y, 'yyyyQQQ')}
              </span>
            )) || (
              <ButtonLink onClick={() => setActive(y)}>
                {format(y, 'yyyyQQQ')}
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
  quarter,
}: {
  input: TransactionsStatsInput;
  quarter: string | number | Date;
}) {
  const transactions = input
    .transactionsAllTime()
    .filter(t => isSameQuarter(quarter, t.timestampEpoch));
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

export function QuarterlyStats({input}: {input: TransactionsStatsInput}) {
  return (
    <div className="space-y-4">
      <PeriodSummary input={input} />
      <div>
        <h1 className="text-xl font-medium leading-7">
          Expenses ({input.expensesExchanged().length})
        </h1>
        <TopLevelCategoryOwnShareChart
          title="Top level category"
          transactions={input
            .expensesExchanged()
            .map(({t}) => t)
            .filter((t): t is Expense => isExpense(t))}
        />
        <ChildCategoryOwnShareChart
          title="Transaction category"
          transactions={input
            .expensesExchanged()
            .map(({t}) => t)
            .filter((t): t is Expense => isExpense(t))}
        />
        <SortableTransactionsList
          transactions={input
            .expensesExchanged()
            .map(({t}) => t)
            .filter((t): t is Expense => isExpense(t))}
          initialSorting={SortingMode.AMOUNT_DESC}
        />
      </div>
      <div>
        <h1 className="text-xl font-medium leading-7">
          Income ({input.incomeExchanged().length})
        </h1>
        <ChildCategoryOwnShareChart
          title="Income category"
          transactions={input
            .incomeExchanged()
            .map(({t}) => t)
            .filter((t): t is Income => isIncome(t))}
        />
        <SortableTransactionsList
          transactions={input
            .incomeExchanged()
            .map(({t}) => t)
            .filter((t): t is Income => isIncome(t))}
          initialSorting={SortingMode.AMOUNT_DESC}
        />
      </div>
      <VendorStats input={input} quarter={input.interval().start} />
    </div>
  );
}

function PeriodSummary({input}: {input: TransactionsStatsInput}) {
  const displayCurrency = useDisplayCurrency();
  let expense = AmountWithCurrency.zero(displayCurrency);
  for (const {ownShare} of input.expensesExchanged()) {
    expense = expense.add(ownShare);
  }
  let income = AmountWithCurrency.zero(displayCurrency);
  for (const {ownShare} of input.incomeExchanged()) {
    income = income.add(ownShare);
  }
  const expenseIncomeRatio = income.isZero()
    ? Infinity
    : expense.dollar() / income.dollar();
  let trips = AmountWithCurrency.zero(displayCurrency);
  for (const {t, ownShare} of input.expensesExchanged()) {
    if (!isExpense(t) || !t.tripId) {
      continue;
    }
    trips = trips.add(ownShare);
  }
  return (
    <ul className="text-lg">
      <li>Spent: {expense.round().format()}</li>
      <li>Received: {income.round().format()}</li>
      <li>Delta: {income.subtract(expense).round().format()}</li>
      <li>Spent/received: {Math.round(expenseIncomeRatio * 100)}%</li>
      <li>Trips: {trips.round().format()}</li>
    </ul>
  );
}

function NonEmptyPageContent() {
  const {transactions} = useAllDatabaseDataContext();
  const {displaySettings} = useDisplaySettingsContext();
  const [excludeCategories, setExcludeCategories] = useState(
    displaySettings.excludeCategoryIdsInStats()
  );
  const timestamps = transactions
    .map(t => t.timestampEpoch)
    .sort((a, b) => a - b);
  const allDataInterval = {
    start: timestamps[0],
    end: timestamps[timestamps.length - 1],
  };
  const quarters = eachQuarterOfInterval(allDataInterval);
  const [quarter, setQuarter] = useState(quarters[quarters.length - 1]);
  const quarterInterval = {
    start: startOfQuarter(quarter),
    end: endOfQuarter(quarter),
  };
  const {input, failed} = useStatsPageProps(excludeCategories, quarterInterval);
  return (
    <div className="space-y-4">
      <ExcludedCategoriesSelector
        excludedIds={excludeCategories}
        setExcludedIds={setExcludeCategories}
      />
      <Navigation quarters={quarters} active={quarter} setActive={setQuarter} />
      <CurrencyExchangeFailed failedTransactions={failed} />
      <QuarterlyStats input={input} />
    </div>
  );
}

export function QuarterlyStatsPage({dbData}: {dbData: AllDatabaseData}) {
  if (!isFullyConfigured(dbData)) {
    return <NotConfiguredYet />;
  }
  return (
    <AllDatabaseDataContextProvider dbData={dbData}>
      <NonEmptyPageContent />
    </AllDatabaseDataContextProvider>
  );
}
