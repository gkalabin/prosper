import {mustFindByCode} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {Unit} from '@/lib/model/Unit';
import {Bank as DBBank, BankAccount as DBBankAccount} from '@prisma/client';

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

export function accountsForBank(
  bank: Bank,
  accounts: BankAccount[]
): BankAccount[] {
  return accounts.filter(a => a.bankId == bank.id);
}

export function bankPageURL(bank: Bank): string {
  const name = bank.name
    .replace(/ /g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
  if (!name) {
    return `/bank/${bank.id}`;
  }
  return `/bank/${bank.id}/${encodeURIComponent(name)}`;
}

export type BankAccount = {
  id: number;
  name: string;
  bankId: number;
  initialBalanceCents: number;
  currencyCode: string | null;
  stockId?: number | null;
  displayOrder: number;
  archived: boolean;
  joint: boolean;
};

export function bankAccountModelFromDB(init: DBBankAccount): BankAccount {
  return {
    id: init.id,
    name: init.name,
    bankId: init.bankId,
    initialBalanceCents: init.initialBalanceCents,
    currencyCode: init.currencyCode,
    stockId: init.stockId,
    displayOrder: init.displayOrder,
    archived: init.archived,
    joint: init.joint,
  };
}

export function accountUnit(account: BankAccount, stocks: Stock[]): Unit {
  if (account.currencyCode) {
    return mustFindByCode(account.currencyCode);
  }
  if (account.stockId) {
    const stock = stocks.find(s => s.id == account.stockId);
    if (!stock) {
      throw new Error(
        `Cannot find stock ${account.stockId} for account ${account.id}`
      );
    }
    return stock;
  }
  throw new Error(`Account ${account.id} has no unit`);
}

export function accountBank(account: BankAccount, banks: Bank[]): Bank {
  const bank = banks.find(b => b.id == account.bankId);
  if (!bank) {
    throw new Error(
      `Cannot find bank ${account.bankId} for account ${account.id}`
    );
  }
  return bank;
}

export function fullAccountName(account: BankAccount, banks: Bank[]): string {
  const bank = banks.find(b => b.id == account.bankId);
  if (!bank) {
    throw new Error(
      `Cannot find bank ${account.bankId} for account ${account.id}`
    );
  }
  return `${bank.name}: ${account.name}`;
}

export function mustFindBankAccount(
  accounts: BankAccount[],
  id: number
): BankAccount {
  const account = accounts.find(a => a.id === id);
  if (!account) {
    throw new Error(`Account ${id} not found`);
  }
  return account;
}

export function accountUnitsEqual(a: BankAccount, b: BankAccount): boolean {
  if (a.currencyCode && b.currencyCode) {
    return a.currencyCode === b.currencyCode;
  }
  if (a.stockId && b.stockId) {
    return a.stockId === b.stockId;
  }
  return false;
}
