import {ExpenseFormSchema} from '@/components/txform/expense/types';
import {IncomeFormSchema} from '@/components/txform/income/types';
import {mostFrequentBankAccount} from '@/components/txform/prefill';
import {
  isRecent,
  topCategoriesMatchMost,
} from '@/components/txform/shared/useTopCategoryIds';
import {TransferFormSchema} from '@/components/txform/transfer/types';
import {assert} from '@/lib/assert';
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
import {startOfDay} from 'date-fns';

export function transferFormEmpty({
  transactions,
  categories,
  bankAccounts,
  fromAccountId,
  toAccountId,
}: {
  transactions: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
  fromAccountId?: number | null;
  toAccountId?: number | null;
}): TransferFormSchema {
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isTransfer, isRecent],
      want: 1,
    })[0] ?? categories[0].id;
  const values: TransferFormSchema = {
    timestamp: startOfDay(new Date()),
    amountSent: 0,
    amountReceived: 0,
    categoryId,
    fromAccountId:
      fromAccountId ??
      mostFrequentBankAccount({
        transactions,
        bankAccounts,
        transactionToAccountId: t => (isTransfer(t) ? t.fromAccountId : null),
      }),
    toAccountId:
      toAccountId ??
      mostFrequentBankAccount({
        transactions,
        bankAccounts,
        transactionToAccountId: t => (isTransfer(t) ? t.toAccountId : null),
      }),
    description: null,
    tagNames: [],
  };
  return values;
}

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
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isTransfer, isRecent],
      want: 1,
    })[0] ?? prev.categoryId;
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
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isTransfer, isRecent],
      want: 1,
    })[0] ?? prev.categoryId;
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
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isTransfer, isRecent],
      want: 1,
    })[0] ?? categories[0].id;
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
