import {DatabaseUpdates} from '@/actions/txform/types';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {SetStateAction} from 'react';

export function onTransactionChange(
  setDbData: Setter<AllDatabaseData>,
  {trip, tags, prototypes, transactionLinks, transactions}: DatabaseUpdates
) {
  setDbData(old => {
    // Add new trip if any.
    let updatedTrips = [...old.dbTrips];
    if (trip) {
      updatedTrips = updateOrAppend(updatedTrips, trip);
    }
    // Add all newly added tags.
    let updatedTags = [...old.dbTags];
    tags.forEach(t => (updatedTags = updateOrAppend(updatedTags, t)));
    // Add all newly added prototypes.
    const updatedPrototypes = [...old.dbTransactionPrototypes, ...prototypes];
    // Update the transactions.
    let updatedTransactions = [...old.dbTransactions];
    Object.entries(transactions).forEach(([id, transaction]) => {
      if (transaction) {
        updatedTransactions = updateOrAppend(updatedTransactions, transaction);
      } else {
        updatedTransactions = updatedTransactions.filter(
          t => t.id !== Number(id)
        );
      }
    });
    // Update the transaction links.
    let updatedLinks = [...old.dbTransactionLinks];
    Object.entries(transactionLinks).forEach(([id, link]) => {
      if (link) {
        updatedLinks = updateOrAppend(updatedLinks, link);
      } else {
        updatedLinks = updatedLinks.filter(l => l.id !== Number(id));
      }
    });
    return Object.assign({}, old, {
      dbTransactions: updatedTransactions,
      dbTransactionLinks: updatedLinks,
      dbTrips: updatedTrips,
      dbTags: updatedTags,
      dbTransactionPrototypes: updatedPrototypes,
    });
  });
}

export function updateOrAppend<T extends {id: unknown}>(
  list: T[],
  item: T
): T[] {
  let updated = false;
  const updatedList = list.map(x => {
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

export type Setter<T> = (value: SetStateAction<T>) => void;

export function updateState<T extends {id: unknown}>(setter: Setter<T[]>) {
  return (x: T) => {
    setter(old => updateOrAppend(old, x));
  };
}
