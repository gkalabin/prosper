import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { IOpenBankingData } from "lib/openbanking/interface";
import { TransactionAPIResponse } from "lib/transactionDbUtils";
import { SetStateAction } from "react";

export function onTransactionChange(
  setDbData: Setter<AllDatabaseData>,
  setObData?: Setter<IOpenBankingData>
) {
  return ({
    transaction,
    trip,
    tags,
    openBankingTransactions,
  }: TransactionAPIResponse) => {
    setDbData((old) => {
      let updatedTrips = [...old.dbTrips];
      if (trip) {
        updatedTrips = updateOrAppend(updatedTrips, trip);
      }
      let updatedTags = [...old.dbTags];
      tags.forEach((t) => (updatedTags = updateOrAppend(updatedTags, t)));
      return Object.assign({}, old, {
        dbTransactions: updateOrAppend(old.dbTransactions, transaction),
        dbTrips: updatedTrips,
        dbTags: updatedTags,
      });
    });
    if (!setObData) {
      return;
    }
    setObData((old) => {
      const updatedObTransactions = [
        ...old.dbOpenBankingTransactions,
        ...openBankingTransactions,
      ];
      return { ...old, dbOpenBankingTransactions: updatedObTransactions };
    });
  };
}

export function updateOrAppend<T extends { id: unknown }>(
  list: T[],
  item: T
): T[] {
  let updated = false;
  const updatedList = list.map((x) => {
    if (x.id == item.id) {
      updated = true;
      return item;
    }
    return x;
  });
  if (updated) {
    return updatedList;
  }
  return [...list, item];
}

type Setter<T> = (value: SetStateAction<T>) => void;

export function updateState<T extends { id: unknown }>(setter: Setter<T[]>) {
  return (x: T) => {
    setter((old) => updateOrAppend(old, x));
  };
}
