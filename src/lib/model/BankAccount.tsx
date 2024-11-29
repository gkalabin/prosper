import {assert} from '@/lib/assert';
import {mustFindByCode} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {Unit} from '@/lib/model/Unit';
import {Bank as DBBank, BankAccount as DBBankAccount} from '@prisma/client';

export type Bank = {
  iid: number;
  name: string;
  displayOrder: number;
};

export function bankModelFromDB(init: DBBank): Bank {
  return {
    iid: init.iid,
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

function nameForURL(name: string): string {
  return name
    .replace(/ /g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

export function bankPageURL(bank: Bank): string {
  const name = nameForURL(bank.name);
  if (!name) {
    return `/bank/${bank.iid}`;
  }
  return `/bank/${bank.iid}/${encodeURIComponent(name)}`;
}

export function accountPageURL(account: BankAccount, bank: Bank): string {
  assert(
    account.bankId == bank.iid,
    `Bank ${bank.iid} doesn't match account bank ${account.bankId}`
  );
  const accountName = nameForURL(account.name);
  if (!accountName) {
    return `/account/${account.id}`;
  }
  const bankName = nameForURL(bank.name);
  const name = bankName ? `${accountName}-${bankName}` : accountName;
  return `/account/${account.id}/${encodeURIComponent(name)}`;
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
