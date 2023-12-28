import ReactEcharts from "echarts-for-react";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { defaultPieChartOptions } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";
import { AppendMap, currencyAppendMap } from "lib/util/AppendingMap";

export function TopLevelCategoryOwnShareChart({
  transactions,
  title,
}: {
  transactions: Transaction[];
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const data = currencyAppendMap<number>(displayCurrency);
  for (const t of transactions) {
    const cid = t.category.root().id();
    data.append(cid, t.amountOwnShare(displayCurrency));
  }
  return <ByCategoryChart title={title} data={data} />;
}

export function TopLevelCategoryFullAmountChart({
  transactions,
  title,
}: {
  transactions: Transaction[];
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const data = currencyAppendMap<number>(displayCurrency);
  for (const t of transactions) {
    const cid = t.category.root().id();
    data.append(cid, t.amountAllParties(displayCurrency));
  }
  return <ByCategoryChart title={title} data={data} />;
}

export function ChildCategoryOwnShareChart({
  transactions,
  title,
}: {
  transactions: Transaction[];
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const data = currencyAppendMap<number>(displayCurrency);
  for (const t of transactions) {
    const cid = t.category.id();
    data.append(cid, t.amountOwnShare(displayCurrency));
  }
  return <ByCategoryChart title={title} data={data} />;
}

export function ChildCategoryFullAmountChart({
  transactions,
  title,
}: {
  transactions: Transaction[];
  title: string;
}) {
  const displayCurrency = useDisplayCurrency();
  const data = currencyAppendMap<number>(displayCurrency);
  for (const t of transactions) {
    const cid = t.category.id();
    data.append(cid, t.amountAllParties(displayCurrency));
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
