import {TransactionWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {
  Bank,
  BankAccount,
  accountBank,
  accountUnit,
} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {mustFindByCode} from '@/lib/model/Currency';
import {Stock} from '@/lib/model/Stock';
import {Tag, mustFindTag} from '@/lib/model/Tag';
import {Trip} from '@/lib/model/Trip';
import {Unit, formatUnit} from '@/lib/model/Unit';
import {Income, incomeModelFromDB} from '@/lib/model/transaction/Income';
import {
  PersonalExpense,
  personalExpenseModelFromDB,
} from '@/lib/model/transaction/PersonalExpense';
import {
  ThirdPartyExpense,
  thirdPartyExpenseModelFromDB,
} from '@/lib/model/transaction/ThirdPartyExpense';
import {Transfer, transferModelFromDB} from '@/lib/model/transaction/Transfer';
import {notEmpty} from '@/lib/util/util';
import {TransactionType} from '@prisma/client';

export type Transaction =
  | PersonalExpense
  | ThirdPartyExpense
  | Transfer
  | Income;

export type Expense = PersonalExpense | ThirdPartyExpense;

export type TransactionWithTrip = (Expense | Income) & {
  tripId: Required<number>;
};

export function hasTrip(value: Transaction): value is TransactionWithTrip {
  return !!(value as TransactionWithTrip).tripId;
}

export function transactionModelFromDB(
  init: TransactionWithTagIds
): Transaction {
  if (init.transactionType == TransactionType.PERSONAL_EXPENSE) {
    return personalExpenseModelFromDB(init);
  }
  if (init.transactionType == TransactionType.THIRD_PARTY_EXPENSE) {
    return thirdPartyExpenseModelFromDB(init);
  }
  if (init.transactionType == TransactionType.TRANSFER) {
    return transferModelFromDB(init);
  }
  if (init.transactionType == TransactionType.INCOME) {
    return incomeModelFromDB(init);
  }
  throw new Error(`Unknown transaction type: ${JSON.stringify(init)}`);
}

export function transactionBankAccount(
  t: PersonalExpense | Income,
  bankAccounts: BankAccount[]
): BankAccount {
  const account = bankAccounts.find(a => a.id == t.accountId);
  if (!account) {
    throw new Error(
      `Cannot find account ${t.accountId} for transaction ${t.id}`
    );
  }
  return account;
}

export function transactionBank(
  t: PersonalExpense | Income,
  banks: Bank[],
  bankAccounts: BankAccount[]
): Bank {
  const account = transactionBankAccount(t, bankAccounts);
  return accountBank(account, banks);
}

export function transactionUnit(
  t: PersonalExpense | ThirdPartyExpense | Income,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): Unit {
  switch (t.kind) {
    case 'PersonalExpense':
    case 'Income':
      const account = transactionBankAccount(t, bankAccounts);
      return accountUnit(account, stocks);
    case 'ThirdPartyExpense':
      return mustFindByCode(t.currencyCode);
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`No unit for ${_exhaustiveCheck}`);
  }
}

export function transactionTags(t: Transaction, allTags: Tag[]): Tag[] {
  const findTag = (id: number) => mustFindTag(id, allTags);
  return t.tagsIds.map(findTag).filter(notEmpty);
}

export function transactionTrip(
  t: PersonalExpense | ThirdPartyExpense | Income,
  allTrips: Trip[]
): Trip | null {
  return allTrips.find(trip => trip.id == t.tripId) ?? null;
}

export function isPersonalExpense(t: Transaction): t is PersonalExpense {
  return t.kind === 'PersonalExpense';
}

export function isThirdPartyExpense(t: Transaction): t is ThirdPartyExpense {
  return t.kind === 'ThirdPartyExpense';
}

export function isExpense(
  t: Transaction
): t is PersonalExpense | ThirdPartyExpense {
  return isPersonalExpense(t) || isThirdPartyExpense(t);
}

export function isTransfer(t: Transaction): t is Transfer {
  return t.kind === 'Transfer';
}

export function isIncome(t: Transaction): t is Income {
  return t.kind === 'Income';
}

export function formatAmount(
  t: PersonalExpense,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): string {
  const account = transactionBankAccount(t, bankAccounts);
  const unit = accountUnit(account, stocks);
  return formatUnit(unit, t.amountCents / 100);
}

export function otherPartyNameOrNull(t: Transaction): string | null {
  if (t.kind == 'Transfer') {
    return null;
  }
  return otherPartyName(t);
}

export function otherPartyName(t: Expense | Income): string | null {
  if (!t.companions.length) {
    return null;
  }
  return t.companions[0].name;
}

export function transactionCategory(
  t: Transaction,
  allCategories: Category[]
): Category {
  const c = allCategories.find(c => c.id == t.categoryId);
  if (!c) {
    throw new Error(
      `Cannot find category ${t.categoryId} for transaction ${t.id}`
    );
  }
  return c;
}
