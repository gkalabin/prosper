import { ButtonLink } from "components/ui/buttons";
import { useAllDatabaseDataContext } from "lib/ClientSideModel";
import { useDisplayCurrency } from "lib/displaySettings";
import { Transaction } from "lib/model/Transaction";
import { onTransactionChange } from "lib/stateHelpers";
import { useState } from "react";
import { TransactionsList } from "./TransactionsList";

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
  const { setDbData } = useAllDatabaseDataContext();
  const displayCurrency = useDisplayCurrency();
  if (!props.transactions?.length) {
    return <div>No transactions.</div>;
  }
  const sortedTransactions = [...props.transactions].sort((a, b) => {
    switch (sorting) {
      case SortingMode.AMOUNT_ASC:
        return (
          a.amountAllParties(displayCurrency).dollar() -
          b.amountAllParties(displayCurrency).dollar()
        );
      case SortingMode.AMOUNT_DESC:
        return (
          b.amountAllParties(displayCurrency).dollar() -
          a.amountAllParties(displayCurrency).dollar()
        );
      case SortingMode.DATE_ASC:
        return a.timestamp.getTime() - b.timestamp.getTime();
      case SortingMode.DATE_DESC:
        return b.timestamp.getTime() - a.timestamp.getTime();
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
