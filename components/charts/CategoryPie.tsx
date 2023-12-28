import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { defaultPieChartOptions } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import {
  Expense,
  Income,
  amountAllParties,
  amountOwnShare,
} from "lib/model/Transaction";
import { AppendMap, currencyAppendMap } from "lib/util/AppendingMap";

export function TopLevelCategoryOwnShareChart({
  transactions,
  title,
}: {
  transactions: (Expense | Income)[];
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const { categories, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const data = currencyAppendMap<number>(displayCurrency);
  for (const t of transactions) {
    const category = categories.find((c) => c.id() == t.categoryId);
    const cid = category.root().id();
    const amount = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    data.append(cid, amount);
  }
  return <ByCategoryChart title={title} data={data} />;
}

export function TopLevelCategoryFullAmountChart({
  transactions,
  title,
}: {
  transactions: (Expense | Income)[];
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const { categories, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const data = currencyAppendMap<number>(displayCurrency);
  for (const t of transactions) {
    const category = categories.find((c) => c.id() == t.categoryId);
    const cid = category.root().id();
    const amount = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    data.append(cid, amount);
  }
  return <ByCategoryChart title={title} data={data} />;
}

export function ChildCategoryOwnShareChart({
  transactions,
  title,
}: {
  transactions: (Expense | Income)[];
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const { categories, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const data = currencyAppendMap<number>(displayCurrency);
  for (const t of transactions) {
    const category = categories.find((c) => c.id() == t.categoryId);
    const cid = category.id();
    const amount = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    data.append(cid, amount);
  }
  return <ByCategoryChart title={title} data={data} />;
}

export function ChildCategoryFullAmountChart({
  transactions,
  title,
}: {
  transactions: (Expense | Income)[];
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const { categories, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const data = currencyAppendMap<number>(displayCurrency);
  for (const t of transactions) {
    const category = categories.find((c) => c.id() == t.categoryId);
    const cid = category.id();
    const amount = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
    data.append(cid, amount);
  }
  return <ByCategoryChart title={title} data={data} />;
}

function ByCategoryChart({
  data,
  title,
}: {
  data: AppendMap<number, AmountWithCurrency>;
  title: string;
}) {
  const { categories } = useAllDatabaseDataContext();
  return (
    <ReactEcharts
      notMerge
      option={{
        ...defaultPieChartOptions(),
        title: {
          text: title,
        },
        series: [
          {
            type: "pie",
            data: [...data.entries()].map(([cid, amount]) => ({
              name: categories.find((c) => c.id() == cid).nameWithAncestors(),
              value: amount.dollar(),
            })),
          },
        ],
      }}
    />
  );
}
