import { CurrencyExchangeFailed } from "app/stats/CurrencyExchangeFailed";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  StockAndCurrencyExchange,
} from "lib/ClientSideModel";
import { useAllDatabaseDataContext } from "lib/context/AllDatabaseDataContext";
import { defaultPieChartOptions } from "lib/charts";
import { useDisplayCurrency } from "lib/displaySettings";
import { BankAccount } from "lib/model/BankAccount";
import { Category, mustFindCategory } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { Stock } from "lib/model/Stock";
import { Income } from "lib/model/transaction/Income";
import { Expense, Transaction } from "lib/model/transaction/Transaction";
import {
  amountAllParties,
  amountOwnShare,
} from "lib/model/transaction/amounts";
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
  return (
    <ByCategoryChart
      title={title}
      transactions={transactions}
      categoryFn={rootCategoryId}
      amountFn={amountOwnShare}
    />
  );
}

export function TopLevelCategoryFullAmountChart({
  transactions,
  title,
}: {
  transactions: (Expense | Income)[];
  title: string;
}) {
  return (
    <ByCategoryChart
      title={title}
      transactions={transactions}
      categoryFn={rootCategoryId}
      amountFn={amountAllParties}
    />
  );
}

export function ChildCategoryOwnShareChart({
  transactions,
  title,
}: {
  transactions: (Expense | Income)[];
  title: string;
}) {
  return (
    <ByCategoryChart
      title={title}
      transactions={transactions}
      categoryFn={leafCategoryId}
      amountFn={amountOwnShare}
    />
  );
}

export function ChildCategoryFullAmountChart({
  transactions,
  title,
}: {
  transactions: (Expense | Income)[];
  title: string;
}) {
  return (
    <ByCategoryChart
      title={title}
      transactions={transactions}
      categoryFn={leafCategoryId}
      amountFn={amountAllParties}
    />
  );
}

function groupTransactions<T>({
  currency,
  transactions,
  groupFn,
  amountFn,
}: {
  currency: Currency;
  transactions: (Expense | Income)[];
  groupFn: (t: Transaction) => T;
  amountFn: (t: Expense | Income, currency: Currency) => AmountWithCurrency;
}): AppendMap<T, AmountWithCurrency> {
  const data = currencyAppendMap<T>(currency);
  for (const t of transactions) {
    const k = groupFn(t);
    const amount = amountFn(t, currency);
    data.append(k, amount);
  }
  return data;
}

function rootCategoryId(t: Transaction, categories: Category[]): number {
  const category = mustFindCategory(t.categoryId, categories);
  return category.root().id();
}

function leafCategoryId(t: Transaction, categories: Category[]): number {
  const category = mustFindCategory(t.categoryId, categories);
  return category.id();
}

function ByCategoryChart({
  transactions,
  title,
  categoryFn,
  amountFn,
}: {
  transactions: (Expense | Income)[];
  title: string;
  categoryFn: (t: Transaction, categories: Category[]) => number;
  amountFn: (
    t: Expense | Income,
    target: Currency,
    bankAccounts: BankAccount[],
    stocks: Stock[],
    exchange: StockAndCurrencyExchange,
  ) => AmountWithCurrency | undefined;
}) {
  const { categories, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  const failedToExchange: Transaction[] = [];
  const groupFn = (t: Transaction): number => categoryFn(t, categories);
  const amountFnWithModel = (
    t: Expense | Income,
    currency: Currency,
  ): AmountWithCurrency => {
    const amount = amountFn(t, currency, bankAccounts, stocks, exchange);
    if (!amount) {
      failedToExchange.push(t);
      return AmountWithCurrency.zero(currency);
    }
    return amount;
  };
  const data = groupTransactions<number>({
    currency: displayCurrency,
    transactions,
    groupFn,
    amountFn: amountFnWithModel,
  });
  return (
    <>
      <CurrencyExchangeFailed failedTransactions={failedToExchange} />
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
    </>
  );
}
