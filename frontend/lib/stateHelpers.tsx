import {SetStateAction} from 'react';

function updateOrAppend<T extends {id: unknown}>(list: T[], item: T): T[] {
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

type Setter<T> = (value: SetStateAction<T>) => void;

export function updateState<T extends {id: unknown}>(setter: Setter<T[]>) {
  return (x: T) => {
    setter(old => updateOrAppend(old, x));
  };
}
