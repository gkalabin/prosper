import {uniqMostFrequent} from '@/lib/collections';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {Transaction} from '@/lib/model/transactionNEW/Transaction';
import {appendNewItems} from '@/lib/util/util';
import {differenceInMonths} from 'date-fns';

export function isExpense(t: Transaction) {
  return t.kind === 'EXPENSE';
}

export function isIncome(t: Transaction) {
  return t.kind === 'INCOME';
}

export function isRecent(t: Transaction) {
  const now = new Date();
  return differenceInMonths(now, t.timestampEpoch) < 3;
}

export function matchesVendor(vendor: string) {
  vendor = vendor.trim();
  return (t: Transaction) =>
    t.kind === 'EXPENSE' &&
    (!vendor || vendor.toLowerCase() == t.vendor.trim().toLowerCase());
}

export function matchesPayer(payer: string) {
  payer = payer.trim();
  return (t: Transaction) =>
    t.kind === 'INCOME' &&
    (!payer || payer.toLowerCase() == t.payer.trim().toLowerCase());
}

export type TransactionFilterFn = (t: Transaction) => boolean;

export function useTopCategoriesMatchMost({
  filters,
  want,
}: {
  filters: TransactionFilterFn[];
  want: number;
}): number[] {
  const {transactions} = useTransactionDataContext();
  return topCategoriesMatchMost({filters, want, transactions});
}

export function topCategoriesMatchMost({
  filters,
  want,
  transactions,
}: {
  filters: TransactionFilterFn[];
  want: number;
  transactions: Transaction[];
}): number[] {
  let result: number[] = [];
  const current = [...filters];
  while (result.length < want && current.length > 0) {
    const newCategories = uniqMostFrequent(
      transactions
        .filter(
          t =>
            t.kind === 'EXPENSE' || t.kind === 'INCOME' || t.kind === 'TRANSFER'
        )
        .filter(t => current.every(f => f(t)))
        .map(t => t.categorisation.categoryId)
    );
    result = appendNewItems(result, newCategories);
    current.pop();
  }
  return result;
}

export function topCategoriesMatchAll({
  filters,
  want,
  transactions,
}: {
  filters: TransactionFilterFn[];
  want: number;
  transactions: Transaction[];
}): number[] {
  const filtered = transactions
    .filter(
      t => t.kind === 'EXPENSE' || t.kind === 'INCOME' || t.kind === 'TRANSFER'
    )
    .filter(t => filters.every(f => f(t)));
  const result = uniqMostFrequent(
    filtered.map(t => t.categorisation.categoryId)
  );
  return result.slice(0, want);
}
