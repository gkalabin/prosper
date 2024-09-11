import {IncomeFormSchema} from '@/components/txform/v2/income/validation';
import {
  ExpenseFormSchema,
  TransferFormSchema,
} from '@/components/txform/v2/types';
import {assert} from '@/lib/assert';
import {uniqMostFrequent} from '@/lib/collections';
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {isTransfer, Transaction} from '@/lib/model/transaction/Transaction';
import {TransferPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {differenceInMonths} from 'date-fns';

export function expenseToTransfer(
  prev: ExpenseFormSchema,
  bankAccounts: BankAccount[]
): TransferFormSchema {
  assert(bankAccounts.length > 0);
  return {
    timestamp: prev.timestamp,
    amountSent: prev.amount,
    amountReceived: prev.amount,
    categoryId: prev.categoryId,
    fromAccountId: prev.accountId ?? bankAccounts[0].id,
    toAccountId: prev.accountId ?? bankAccounts[0].id,
    description: prev.vendor,
    tagNames: [...prev.tagNames],
  };
}

export function incomeToTransfer(prev: IncomeFormSchema): TransferFormSchema {
  return {
    timestamp: prev.timestamp,
    amountSent: prev.amount,
    amountReceived: prev.amount,
    categoryId: prev.categoryId,
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
  const values: TransferFormSchema = {
    timestamp: new Date(withdrawal.timestampEpoch),
    amountSent: withdrawal.absoluteAmountCents / 100,
    amountReceived: deposit.absoluteAmountCents / 100,
    description: withdrawal.description,
    categoryId: mostFrequentCategory(transactions, categories),
    fromAccountId: withdrawal.internalAccountId,
    toAccountId: deposit.internalAccountId,
    tagNames: [],
  };
  return values;
}

function recent(t: Transaction): boolean {
  const now = new Date();
  return differenceInMonths(now, t.timestampEpoch) < 3;
}

function mostFrequentCategory(
  transactions: Transaction[],
  categories: Category[]
) {
  assert(categories.length > 0);
  const transfers = transactions.filter(recent).filter(isTransfer);
  const [mostFrequent] = uniqMostFrequent(transfers.map(t => t.categoryId));
  if (mostFrequent) {
    return mostFrequent;
  }
  // If there are no transfers at all, the most frequent value will not be defined,
  // so fall back to the first category in that case.
  return categories[0].id;
}
