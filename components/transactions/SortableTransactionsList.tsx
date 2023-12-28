import { CurrencyExchangeFailed } from "app/stats/CurrencyExchangeFailed";
import { TransactionsList } from "components/transactions/TransactionsList";
import { ButtonLink } from "components/ui/buttons";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import {
  StockAndCurrencyExchange,
} from "lib/ClientSideModel";
import { useAllDatabaseDataContext } from "lib/context/AllDatabaseDataContext";
import { assertDefined } from "lib/assert";
import { useDisplayCurrency } from "lib/context/DisplaySettingsContext";
import { BankAccount } from "lib/model/BankAccount";
import { Currency } from "lib/model/Currency";
import { Stock } from "lib/model/Stock";
import { isCurrency, isStock } from "lib/model/Unit";
import { Transaction, isTransfer } from "lib/model/transaction/Transaction";
import { amountSent } from "lib/model/transaction/Transfer";
import { amountAllParties } from "lib/model/transaction/amounts";
import { onTransactionChange } from "lib/stateHelpers";
import { useState } from "react";

export enum SortingMode {
  DATE_ASC,
  DATE_DESC,
  AMOUNT_ASC,
  AMOUNT_DESC,
}

function amount(
  transaction: Transaction,
  displayCurrency: Currency,
  bankAccounts: BankAccount[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange,
): AmountWithCurrency | undefined {
  if (isTransfer(transaction)) {
    const sent = amountSent(transaction, bankAccounts, stocks);
    const unit = sent.getUnit();
    if (isCurrency(unit)) {
      const amount = new AmountWithCurrency({
        amountCents: sent.cents(),
        currency: unit,
      });
      return exchange.exchangeCurrency(
        amount,
        displayCurrency,
        transaction.timestampEpoch,
      );
    }
    if (isStock(unit)) {
      return exchange.exchangeStock(
        sent.getAmount(),
        unit,
        displayCurrency,
        transaction.timestampEpoch,
      );
    }
    throw new Error(`Unknown unit: ${unit}`);
  }
  return amountAllParties(
    transaction,
    displayCurrency,
    bankAccounts,
    stocks,
    exchange,
  );
}

export const SortableTransactionsList = (props: {
  transactions: Transaction[];
  displayLimit?: number;
  initialSorting?: SortingMode;
}) => {
  const [sorting, setSorting] = useState(
    props.initialSorting ?? SortingMode.DATE_ASC,
  );
  const { setDbData, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  if (!props.transactions?.length) {
    return <div>No transactions.</div>;
  }

  let sortedTransactions: Transaction[] = [];
  const failedToExchange: Transaction[] = [];
  if (sorting == SortingMode.AMOUNT_ASC || sorting == SortingMode.AMOUNT_DESC) {
    const transactionsWithAmount: Array<{
      t: Transaction;
      a: AmountWithCurrency | undefined;
    }> = sortedTransactions.map((t) => ({
      t,
      a: amount(t, displayCurrency, bankAccounts, stocks, exchange),
    }));
    failedToExchange.push(
      ...transactionsWithAmount.filter((x) => !x.a).map((x) => x.t),
    );
    sortedTransactions = transactionsWithAmount
      .filter((x) => !!x.a)
      .sort((x, y) => {
        assertDefined(x.a);
        assertDefined(y.a);
        switch (sorting) {
          case SortingMode.AMOUNT_ASC:
            return x.a.cents() - y.a.cents();
          case SortingMode.AMOUNT_DESC:
            return y.a.cents() - x.a.cents();
        }
      })
      .map((x) => x.t);
  } else {
    sortedTransactions = [...props.transactions].sort((a, b) => {
      switch (sorting) {
        case SortingMode.DATE_ASC:
          return a.timestampEpoch - b.timestampEpoch;
        case SortingMode.DATE_DESC:
          return b.timestampEpoch - a.timestampEpoch;
        default:
          throw new Error("Unknown sorting mode: " + sorting);
      }
    });
  }

  return (
    <>
      <div className="mb-2 text-xs">
        Sort by{" "}
        <ButtonLink
          onClick={() =>
            setSorting(
              sorting == SortingMode.DATE_ASC
                ? SortingMode.DATE_DESC
                : SortingMode.DATE_ASC,
            )
          }
        >
          date
        </ButtonLink>
        ,{" "}
        <ButtonLink
          onClick={() =>
            setSorting(
              sorting == SortingMode.AMOUNT_DESC
                ? SortingMode.AMOUNT_ASC
                : SortingMode.AMOUNT_DESC,
            )
          }
        >
          amount
        </ButtonLink>
      </div>

      <div>
        <CurrencyExchangeFailed failedTransactions={failedToExchange} />
        <TransactionsList
          transactions={sortedTransactions}
          onTransactionUpdated={onTransactionChange(setDbData)}
          displayLimit={10}
        />
      </div>
    </>
  );
};
