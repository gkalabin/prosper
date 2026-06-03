import {assert} from '@/lib/assert';
import {
  Bank as PbBank,
  BankAccount as PbBankAccount,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {mustFindByCode} from '@/lib/model/Currency';
import {Stock, StockKey, stockKeysEqual} from '@/lib/model/Stock';
import {Unit} from '@/lib/model/Unit';

export type Bank = {
  id: number;
  name: string;
  displayOrder: number;
};

export function bankModelFromDB(init: PbBank): Bank {
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

function nameForURL(name: string): string {
  return name
    .replace(/ /g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

export function bankPageURL(bank: Bank): string {
  const name = nameForURL(bank.name);
  if (!name) {
    return `/bank/${bank.id}`;
  }
  return `/bank/${bank.id}/${encodeURIComponent(name)}`;
}

export function accountPageURL(account: BankAccount, bank: Bank): string {
  assert(
    account.bankId == bank.id,
    `Bank ${bank.id} doesn't match account bank ${account.bankId}`
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
  stock: StockKey | null;
  displayOrder: number;
  archived: boolean;
  joint: boolean;
};

export function bankAccountModelFromDB(init: PbBankAccount): BankAccount {
  return {
    id: init.id,
    name: init.name,
    bankId: init.bankId,
    initialBalanceCents: init.initialBalanceCents,
    currencyCode: init.currencyCode ?? null,
    stock: init.stock
      ? {exchange: init.stock.exchange, ticker: init.stock.ticker}
      : null,
    displayOrder: init.displayOrder,
    archived: init.archived,
    joint: init.joint,
  };
}

export function accountUnit(account: BankAccount, stocks: Stock[]): Unit {
  if (account.currencyCode) {
    return mustFindByCode(account.currencyCode);
  }
  if (account.stock) {
    const key = account.stock;
    const stock = stocks.find(
      s => s.exchange == key.exchange && s.ticker == key.ticker
    );
    if (!stock) {
      throw new Error(
        `Cannot find stock ${key.exchange}/${key.ticker} for account ${account.id}`
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

// Groups accounts by their bank, preserving account order within each bank and
// bank order by first appearance.
export function groupAccountsByBank(
  accounts: BankAccount[],
  banks: Bank[]
): {bank: Bank; accounts: BankAccount[]}[] {
  const groups: {bank: Bank; accounts: BankAccount[]}[] = [];
  for (const account of accounts) {
    const bank = accountBank(account, banks);
    const group = groups.find(g => g.bank.id == bank.id);
    if (group) {
      group.accounts.push(account);
    } else {
      groups.push({bank, accounts: [account]});
    }
  }
  return groups;
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
  if (a.stock && b.stock) {
    return stockKeysEqual(a.stock, b.stock);
  }
  return false;
}
