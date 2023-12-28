import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { defaultPieChartOptions } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { mustFindCategory } from "lib/model/Category";
import {
  Expense,
  amountAllParties,
  amountOwnShare,
} from "lib/model/transaction/Transaction";
import { Income } from "lib/model/transaction/Income";
import { AppendMap, currencyAppendMap } from "lib/util/AppendingMap";
import dynamic from "next/dynamic";

const ReactEcharts = dynamic(() => import("echarts-for-react"), { ssr: false });

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
    const category = mustFindCategory(t.categoryId, categories);
    const cid = category.root().id();
    const amount = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange,
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
    const category = mustFindCategory(t.categoryId, categories);
    const cid = category.root().id();
    const amount = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange,
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
    const category = mustFindCategory(t.categoryId, categories);
    const cid = category.id();
    const amount = amountOwnShare(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange,
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
    const category = mustFindCategory(t.categoryId, categories);
    const cid = category.id();
    const amount = amountAllParties(
      t,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange,
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
              name: mustFindCategory(cid, categories).nameWithAncestors(),
              value: amount.dollar(),
            })),
          },
        ],
      }}
    />
  );
}
