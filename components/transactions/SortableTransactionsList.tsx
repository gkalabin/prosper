import { TransactionsList } from "components/transactions/TransactionsList";
import { ButtonLink } from "components/ui/buttons";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import {
  Transaction,
  amountAllParties,
  amountSent,
  isTransfer,
} from "lib/model/transaction/Transaction";
import { isCurrency, isStock } from "lib/model/Unit";
import { onTransactionChange } from "lib/stateHelpers";
import { useState } from "react";

export enum SortingMode {
  DATE_ASC,
  DATE_DESC,
  AMOUNT_ASC,
  AMOUNT_DESC,
}

export const SortableTransactionsList = (props: {
  transactions: Transaction[];
  displayLimit?: number;
  initialSorting?: SortingMode;
}) => {
  const [sorting, setSorting] = useState(
    props.initialSorting ?? SortingMode.DATE_ASC
  );
  const { setDbData, bankAccounts, stocks, exchange } =
    useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  if (!props.transactions?.length) {
    return <div>No transactions.</div>;
  }
  const amount = (transaction: Transaction): AmountWithCurrency => {
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
          transaction.timestampEpoch
        );
      }
      if (isStock(unit)) {
        return exchange.exchangeStock(
          sent.getAmount(),
          unit,
          displayCurrency,
          transaction.timestampEpoch
        );
      }
      throw new Error(`Unknown unit: ${unit}`);
    }
    return amountAllParties(
      transaction,
      displayCurrency,
      bankAccounts,
      stocks,
      exchange
    );
  };
  const sortedTransactions = [...props.transactions].sort((a, b) => {
    switch (sorting) {
      case SortingMode.AMOUNT_ASC:
        return amount(a).dollar() - amount(b).dollar();
      case SortingMode.AMOUNT_DESC:
        return amount(b).dollar() - amount(a).dollar();
      case SortingMode.DATE_ASC:
        return a.timestampEpoch - b.timestampEpoch;
      case SortingMode.DATE_DESC:
        return b.timestampEpoch - a.timestampEpoch;
      default:
        throw new Error("Unknown sorting mode: " + sorting);
    }
  });
  return (
    <>
      <div className="mb-2 text-xs">
        Sort by{" "}
        <ButtonLink
          onClick={() =>
            setSorting(
              sorting == SortingMode.DATE_ASC
                ? SortingMode.DATE_DESC
                : SortingMode.DATE_ASC
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
                : SortingMode.AMOUNT_DESC
            )
          }
        >
          amount
        </ButtonLink>
      </div>

      <div>
        <TransactionsList
          transactions={sortedTransactions}
          onTransactionUpdated={onTransactionChange(setDbData)}
          displayLimit={10}
        />
      </div>
    </>
  );
};
