import {Bank as DBBank} from '@prisma/client';

export type Bank = {
  id: number;
  name: string;
  displayOrder: number;
};

export function bankModelFromDB(init: DBBank): Bank {
  return {
    id: init.id,
    name: init.name,
    displayOrder: init.displayOrder,
  };
}

export function bankNameForURL(name: string): string {
  return name
    .replace(/ /g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

export function bankPageURL(bank: Bank): string {
  const name = bankNameForURL(bank.name);
  if (!name) {
    return `/bank/${bank.id}`;
  }
  return `/bank/${bank.id}/${encodeURIComponent(name)}`;
}
