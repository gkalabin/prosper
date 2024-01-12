import {expect} from '@jest/globals';
import {Bank, BankAccount} from 'lib/model/BankAccount';
import {Category} from 'lib/model/Category';
import {Tag} from 'lib/model/Tag';
import {Trip} from 'lib/model/Trip';
import {PersonalExpense} from 'lib/model/transaction/PersonalExpense';
import {Transaction} from 'lib/model/transaction/Transaction';
import {SearchParams, search} from '../search';

let nextId = 1;
const banks: Map<string, Bank> = new Map();
const accounts: Map<string, BankAccount> = new Map();
const categories: Map<string, Category> = new Map();
const trips: Map<string, Trip> = new Map();

export function clearModel(): void {
  banks.clear();
  accounts.clear();
  categories.clear();
  nextId = 1;
}

export function modelParams(transactions: Transaction[]): {
  transactions: Transaction[];
  banks: Bank[];
  bankAccounts: BankAccount[];
  categories: Category[];
  trips: Trip[];
  tags: Tag[];
} {
  return {
    transactions,
    banks: [...banks.values()],
    bankAccounts: [...accounts.values()],
    categories: [...categories.values()],
    trips: [...trips.values()],
    tags: [],
  };
}

export function tx(
  vendor: string,
  amount: number,
  accountString: string,
  category: string
): Transaction {
  const [bank, account] = accountString.split('>').map(s => s.trim());
  if (!banks.has(bank)) {
    banks.set(bank, mkBank(bank));
  }
  if (!accounts.has(account)) {
    accounts.set(account, mkAccount(account, banks.get(bank)!));
  }
  if (!categories.has(category)) {
    categories.set(category, mkCategory(nextId++, category));
  }
  const tx: PersonalExpense = {
    kind: 'PersonalExpense',
    id: nextId++,
    vendor,
    amountCents: Math.round(amount * 100),
    timestampEpoch: new Date().getTime(),
    companions: [],
    note: '',
    accountId: accounts.get(account)!.id,
    categoryId: categories.get(category)!.id(),
    tagsIds: [],
    tripId: null,
    refundGroupTransactionIds: [],
  };
  return tx;
}

export function mkBank(name: string): Bank {
  return {
    name,
    id: nextId++,
    displayOrder: 0,
  };
}

export function mkAccount(name: string, bank: Bank): BankAccount {
  return {
    name,
    id: nextId++,
    bankId: bank.id,
    initialBalanceCents: 0,
    currencyCode: 'GBP',
    displayOrder: 0,
    archived: false,
    joint: false,
  };
}

export function mkCategory(id: number, name: string): Category {
  const c = new Category({
    id,
    name,
    displayOrder: 0,
    parentCategoryId: null,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  categories.set(name, c);
  return c;
}

export function expectSearch(args: {
  q: SearchParams;
  results: Array<Record<string, unknown>>;
}) {
  const actual = search(args.q);
  expect(actual).toHaveLength(args.results.length);
  if (!args.results.length) {
    return;
  }
  expect(actual).toEqual(
    expect.arrayContaining(args.results.map(expect.objectContaining))
  );
}
