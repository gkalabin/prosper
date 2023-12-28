import { SetStateAction } from "react";
import { AllDatabaseData } from "./model/AllDatabaseDataModel";
import { TransactionAPIResponse } from "./transactionCreation";

export function onTransactionChange(setter: Setter<AllDatabaseData>) {
  return ({ transaction, trip, tags }: TransactionAPIResponse) => {
    setter((old) => {
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
