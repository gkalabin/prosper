import {Account, mustFindAccount} from '@/lib/model/Account';
import {Category, mustFindCategory} from '../Category';
import {Expense} from '../transactionNEW/Expense';
import {Income} from '../transactionNEW/Income';
import {Transaction} from '../transactionNEW/Transaction';

export function transactionNoteOrNull(t: Transaction): string | null {
  switch (t.kind) {
    case 'EXPENSE':
    case 'INCOME':
    case 'TRANSFER':
    case 'NOOP':
      return t.note;
    case 'INITIAL_BALANCE':
      return null;
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction ${_exhaustiveCheck}`);
  }
}

export function transactionCategoryOrNull({
  t,
  categories,
}: {
  t: Transaction;
  categories: Category[];
}): Category | null {
  switch (t.kind) {
    case 'EXPENSE':
    case 'INCOME':
    case 'TRANSFER':
      return mustFindCategory(t.categorisation.categoryId, categories);
    case 'NOOP':
    case 'INITIAL_BALANCE':
      return null;
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction ${_exhaustiveCheck}`);
  }
}

export function transactionCompanionNameOrNull({
  t,
  accounts,
}: {
  t: Income | Expense;
  accounts: Account[];
}): string | null {
  const companion = t.categorisation.companion;
  if (!companion) {
    return null;
  }
  const account = mustFindAccount(companion.accountId, accounts);
  return account.name;
}

export type TransactionWithTrip = (Expense | Income) & {
  tripId: Required<number>;
};

export function hasTrip(value: Transaction): value is TransactionWithTrip {
  return !!(value as TransactionWithTrip).tripId;
}
