import {ExpenseFormSchema} from '@/components/txform/v2/expense/types';
import {IncomeFormSchema} from '@/components/txform/v2/income/types';
import {TransferFormSchema} from '@/components/txform/v2/transfer/types';
import {assert} from '@/lib/assert';
import {uniqMostFrequent} from '@/lib/collections';
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {
  isTransfer,
  Transaction,
  transactionTags,
} from '@/lib/model/transaction/Transaction';
import {Transfer} from '@/lib/model/transaction/Transfer';
import {TransferPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {centsToDollar} from '@/lib/util/util';
import {differenceInMonths} from 'date-fns';

export function expenseToTransfer({
  prev,
  bankAccounts,
  transactions,
}: {
  prev: ExpenseFormSchema;
  bankAccounts: BankAccount[];
  transactions: Transaction[];
}): TransferFormSchema {
  assert(bankAccounts.length > 0);
  // Prefer the most frequent category to the value from the previous form type.
  // When switching the form type the user is expecting to see changes in the form and the
  // most frequent value is more likely to be useful compared to the previous mode's category.
  const categoryId = mostFrequentCategory(transactions) ?? prev.categoryId;
  return {
    timestamp: prev.timestamp,
    amountSent: prev.amount,
    amountReceived: prev.amount,
    categoryId,
    fromAccountId: prev.accountId ?? bankAccounts[0].id,
    toAccountId: prev.accountId ?? bankAccounts[0].id,
    description: prev.vendor,
    tagNames: [...prev.tagNames],
  };
}

export function incomeToTransfer({
  prev,
  transactions,
}: {
  prev: IncomeFormSchema;
  transactions: Transaction[];
}): TransferFormSchema {
  // Prefer the most frequent category to the value from the previous form type.
  // When switching the form type the user is expecting to see changes in the form and the
  // most frequent value is more likely to be useful compared to the previous mode's category.
  const categoryId = mostFrequentCategory(transactions) ?? prev.categoryId;
  return {
    timestamp: prev.timestamp,
    amountSent: prev.amount,
    amountReceived: prev.amount,
    categoryId,
    fromAccountId: prev.accountId,
    toAccountId: prev.accountId,
    description: prev.payer,
    tagNames: [...prev.tagNames],
  };
}

export function transferFromPrototype({
  proto,
  transactions,
  categories,
}: {
  proto: TransferPrototype;
  transactions: Transaction[];
  categories: Category[];
}): TransferFormSchema {
  const {withdrawal, deposit} = proto;
  // If there are no transfers at all, the most frequent value will not be defined,
  // so fall back to the first category in that case.
  assert(categories.length > 0);
  const categoryId = mostFrequentCategory(transactions) ?? categories[0].id;
  const values: TransferFormSchema = {
    timestamp: new Date(withdrawal.timestampEpoch),
    amountSent: centsToDollar(withdrawal.absoluteAmountCents),
    amountReceived: centsToDollar(deposit.absoluteAmountCents),
    description: withdrawal.description,
    categoryId,
    fromAccountId: withdrawal.internalAccountId,
    toAccountId: deposit.internalAccountId,
    tagNames: [],
  };
  return values;
}

export function transferFromTransaction({
  transfer: t,
  allTags,
}: {
  transfer: Transfer;
  allTags: Tag[];
}): TransferFormSchema {
  const tags = transactionTags(t, allTags);
  const values: TransferFormSchema = {
    timestamp: new Date(t.timestampEpoch),
    amountSent: centsToDollar(t.sentAmountCents),
    amountReceived: centsToDollar(t.receivedAmountCents),
    description: t.note,
    categoryId: t.categoryId,
    fromAccountId: t.fromAccountId,
    toAccountId: t.toAccountId,
    tagNames: tags.map(t => t.name),
  };
  return values;
}

function recent(t: Transaction): boolean {
  const now = new Date();
  return differenceInMonths(now, t.timestampEpoch) < 3;
}

function mostFrequentCategory(transactions: Transaction[]): number | null {
  const transfers = transactions.filter(recent).filter(isTransfer);
  const [mostFrequent] = uniqMostFrequent(transfers.map(t => t.categoryId));
  if (mostFrequent) {
    return mostFrequent;
  }
  return null;
}
