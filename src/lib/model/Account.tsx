import { assert } from '@/lib/assert';
import { Bank, bankNameForURL } from '@/lib/model/Bank';
import { mustFindByCode } from '@/lib/model/Currency';
import { Stock } from '@/lib/model/Stock';
import { Unit, UnitId } from '@/lib/model/Unit';
import {
  AccountOwnershipNEW,
  AccountTypeNEW,
  AccountNEW as DBAccount,
} from '@prisma/client';

export enum AccountOwnership {
  SELF_OWNED = 'SELF_OWNED',
  OWNED_BY_OTHER = 'OWNED_BY_OTHER',
  JOINT_HALF = 'JOINT_HALF',
  SYSTEM = 'SYSTEM',
}

function mapAccountOwnership(ownership: AccountOwnershipNEW): AccountOwnership {
  switch (ownership) {
    case AccountOwnershipNEW.SELF_OWNED:
      return AccountOwnership.SELF_OWNED;
    case AccountOwnershipNEW.OWNED_BY_OTHER:
      return AccountOwnership.OWNED_BY_OTHER;
    case AccountOwnershipNEW.JOINT_HALF:
      return AccountOwnership.JOINT_HALF;
    case AccountOwnershipNEW.SYSTEM:
      return AccountOwnership.SYSTEM;
    default:
      const _exhaustivenessCheck: never = ownership;
      throw new Error(`Unknown account ownership: ${_exhaustivenessCheck}`);
  }
}

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

function mapAccountType(type: AccountTypeNEW): AccountType {
  switch (type) {
    case AccountTypeNEW.ASSET:
      return AccountType.ASSET;
    case AccountTypeNEW.LIABILITY:
      return AccountType.LIABILITY;
    case AccountTypeNEW.EQUITY:
      return AccountType.EQUITY;
    case AccountTypeNEW.INCOME:
      return AccountType.INCOME;
    case AccountTypeNEW.EXPENSE:
      return AccountType.EXPENSE;
    default:
      const _exhaustivenessCheck: never = type;
      throw new Error(`Unknown account type: ${_exhaustivenessCheck}`);
  }
}

export type Account = {
  id: number;
  name: string;
  bankId: number | null;
  currencyCode: string | null;
  stockId: number | null;
  displayOrder: number;
  archived: boolean;
  ownership: AccountOwnership;
  type: AccountType;
};

export function accountModelFromDB(init: DBAccount): Account {
  return {
    id: init.id,
    name: init.name,
    bankId: init.bankId,
    currencyCode: init.currencyCode,
    stockId: init.stockId,
    displayOrder: init.displayOrder,
    archived: init.archived,
    ownership: mapAccountOwnership(init.ownership),
    type: mapAccountType(init.type),
  };
}

export function accountPageURL(account: Account, bank: Bank): string {
  assert(
    account.bankId == bank.id,
    `Bank ${bank.id} doesn't match account bank ${account.bankId}`
  );
  const accountName = bankNameForURL(account.name);
  if (!accountName) {
    return `/account/${account.id}`;
  }
  const bankName = bankNameForURL(bank.name);
  const name = bankName ? `${accountName}-${bankName}` : accountName;
  return `/account/${account.id}/${encodeURIComponent(name)}`;
}

export function accountUnitId(account: Account): UnitId {
  if (account.currencyCode) {
    return {
      kind: 'CURRENCY',
      currencyCode: account.currencyCode,
    };
  }
  if (account.stockId) {
    return {
      kind: 'STOCK',
      stockId: account.stockId,
    };
  }
  throw new Error(`Account ${account.id} has no unit`);
}

export function accountUnit(account: Account, stocks: Stock[]): Unit {
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

export function accountBank(account: Account, banks: Bank[]): Bank {
  if (!account.bankId) {
    throw new Error(`Account ${account.id} has no bank`);
  }
  const bank = banks.find(b => b.id == account.bankId);
  if (!bank) {
    throw new Error(
      `Cannot find bank ${account.bankId} for account ${account.id}`
    );
  }
  return bank;
}

export function fullAccountName(account: Account, banks: Bank[]): string {
  const bank = accountBank(account, banks);
  return `${bank.name}: ${account.name}`;
}

export function mustFindAccount(accounts: Account[], id: number): Account {
  const account = accounts.find(a => a.id === id);
  if (!account) {
    throw new Error(`Account ${id} not found`);
  }
  return account;
}

export function accountUnitsEqual(a: Account, b: Account): boolean {
  if (a.currencyCode && b.currencyCode) {
    return a.currencyCode === b.currencyCode;
  }
  if (a.stockId && b.stockId) {
    return a.stockId === b.stockId;
  }
  return false;
}

export function accountsForBank(bank: Bank, accounts: Account[]): Account[] {
  return accounts.filter(a => a.bankId == bank.id);
}

export function ownedAssetAccounts(accounts: Account[]): Account[] {
  return accounts
    .filter(
      a =>
        a.ownership == AccountOwnership.SELF_OWNED ||
        a.ownership == AccountOwnership.JOINT_HALF
    )
    .filter(a => a.type == AccountType.ASSET);
}
