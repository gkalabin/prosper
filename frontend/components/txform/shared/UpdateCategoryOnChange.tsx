import {TransactionFormSchema} from '@/components/txform/types';
import {uniqMostFrequent} from '@/lib/collections';
import {useTransactionDataContext} from '@/lib/context/TransactionDataContext';
import {Income} from '@/lib/model/transaction/Income';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {ThirdPartyExpense} from '@/lib/model/transaction/ThirdPartyExpense';
import {
  isExpense,
  isIncome,
  isTransfer,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {Transfer} from '@/lib/model/transaction/Transfer';
import {useEffect, useMemo} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

type TransactionWithCategory =
  | PersonalExpense
  | ThirdPartyExpense
  | Income
  | Transfer;
type CategorisedFilter = (t: Transaction) => t is TransactionWithCategory;

function matchesVendor(vendor: string): CategorisedFilter {
  const want = vendor.trim().toLowerCase();
  return (t): t is PersonalExpense | ThirdPartyExpense =>
    isExpense(t) && (!want || t.vendor.trim().toLowerCase() == want);
}

function matchesPayer(payer: string): CategorisedFilter {
  const want = payer.trim().toLowerCase();
  return (t): t is Income =>
    isIncome(t) && (!want || t.payer.trim().toLowerCase() == want);
}

function matchesDescription(description: string): CategorisedFilter {
  const want = description.trim().toLowerCase();
  return (t): t is Transfer =>
    isTransfer(t) && (!want || t.note.trim().toLowerCase() == want);
}

function mostFrequentCategory(
  transactions: Transaction[],
  match: CategorisedFilter
): number | undefined {
  const [top] = uniqMostFrequent(
    transactions.filter(match).map(t => t.categoryId)
  );
  return top;
}

// Sets the category to the one most frequently used on transactions matching
// the current vendor/payer/description.
//
// Kept as standalone components that render nothing because watching the
// vendor/payer field would otherwise re-render the expensive category select.
// The category is overwritten even after the user touched it: the form is
// filled top to bottom with the vendor/payer above the category, so a category
// edit followed by a vendor/payer edit is rare and not worth preserving.
function useUpdateCategory(
  fieldName: 'expense.categoryId' | 'income.categoryId' | 'transfer.categoryId',
  match: CategorisedFilter
): void {
  const {setValue} = useFormContext<TransactionFormSchema>();
  const {transactions} = useTransactionDataContext();
  useEffect(() => {
    const categoryId = mostFrequentCategory(transactions, match);
    if (categoryId !== undefined) {
      setValue(fieldName, categoryId);
    }
  }, [fieldName, match, setValue, transactions]);
}

export function UpdateCategoryOnVendorChange() {
  const vendor = useWatch({name: 'expense.vendor', exact: true});
  const match = useMemo(() => matchesVendor(vendor ?? ''), [vendor]);
  useUpdateCategory('expense.categoryId', match);
  return null;
}

export function UpdateCategoryOnPayerChange() {
  const payer = useWatch({name: 'income.payer', exact: true});
  const match = useMemo(() => matchesPayer(payer ?? ''), [payer]);
  useUpdateCategory('income.categoryId', match);
  return null;
}

export function UpdateCategoryOnDescriptionChange() {
  const description = useWatch({name: 'transfer.description', exact: true});
  const match = useMemo(
    () => matchesDescription(description ?? ''),
    [description]
  );
  useUpdateCategory('transfer.categoryId', match);
  return null;
}
