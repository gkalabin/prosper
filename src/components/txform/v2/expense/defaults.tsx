import {IncomeFormSchema} from '@/components/txform/v2/income/validation';
import {
  ExpenseFormSchema,
  TransferFormSchema,
} from '@/components/txform/v2/types';
import {assert} from '@/lib/assert';
import {uniqMostFrequent} from '@/lib/collections';
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {
  Transaction,
  isExpense,
  isPersonalExpense,
} from '@/lib/model/transaction/Transaction';
import {WithdrawalPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {differenceInMonths, startOfDay} from 'date-fns';

export function expenseFormEmpty({
  transactions,
  categories,
  bankAccounts,
}: {
  transactions: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
}): ExpenseFormSchema {
  const values: ExpenseFormSchema = {
    timestamp: startOfDay(new Date()),
    amount: 0,
    ownShareAmount: 0,
    vendor: '',
    categoryId: mostFrequentCategory(transactions, categories, null),
    accountId: mostFrequentAccount(transactions, bankAccounts),
    tagNames: [],
    sharingType: 'PAID_SELF_NOT_SHARED',
    description: null,
    tripName: null,
    companion: null,
    payer: null,
    repayment: null,
  };
  return values;
}

export function expenseFromPrototype({
  proto,
  transactions,
  categories,
}: {
  proto: WithdrawalPrototype;
  transactions: Transaction[];
  categories: Category[];
}): ExpenseFormSchema {
  const values: ExpenseFormSchema = {
    timestamp: new Date(proto.timestampEpoch),
    amount: proto.absoluteAmountCents / 100,
    ownShareAmount: 0,
    vendor: proto.description,
    categoryId: mostFrequentCategory(
      transactions,
      categories,
      proto.description
    ),
    accountId: proto.internalAccountId,
    tagNames: [],
    sharingType: 'PAID_SELF_NOT_SHARED',
    description: null,
    tripName: null,
    companion: null,
    payer: null,
    repayment: null,
  };
  return values;
}

export function incomeToExpense(prev: IncomeFormSchema): ExpenseFormSchema {
  const values: ExpenseFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amount,
    ownShareAmount: prev.ownShareAmount,
    vendor: prev.payer,
    categoryId: prev.categoryId,
    accountId: prev.accountId,
    tagNames: prev.tagNames,
    sharingType: prev.companion ? 'PAID_SELF_SHARED' : 'PAID_SELF_NOT_SHARED',
    description: null,
    tripName: null,
    companion: null,
    payer: null,
    repayment: null,
  };
  return values;
}

export function transferToExpense(prev: TransferFormSchema): ExpenseFormSchema {
  const values: ExpenseFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amountSent,
    ownShareAmount: prev.amountSent,
    vendor: prev.description ?? '',
    categoryId: prev.categoryId,
    accountId: prev.fromAccountId,
    tagNames: [],
    sharingType: 'PAID_SELF_NOT_SHARED',
    description: null,
    tripName: null,
    companion: null,
    payer: null,
    repayment: null,
  };
  return values;
}

function mostFrequentAccount(
  transactions: Transaction[],
  bankAccounts: BankAccount[]
) {
  assert(bankAccounts.length > 0);
  const [mostFrequent] = uniqMostFrequent(
    transactions.filter(isPersonalExpense).map(t => t.accountId)
  );
  if (mostFrequent) {
    return mostFrequent;
  }
  // If there are no personal expenses at all, the most frequent value will not be defined,
  // so fall back to the first visible account in that case.
  const accountId =
    bankAccounts.filter(a => !a.archived)[0]?.id ?? bankAccounts[0].id;
  return accountId;
}

function recent(t: Transaction): boolean {
  const now = new Date();
  return differenceInMonths(now, t.timestampEpoch) < 3;
}

function mostFrequentCategory(
  transactions: Transaction[],
  categories: Category[],
  vendor: string | null
) {
  assert(categories.length > 0);
  if (vendor) {
    const expenses = transactions
      .filter(isExpense)
      .filter(t => t.vendor == vendor);
    const [mostFrequent] = uniqMostFrequent(expenses.map(t => t.categoryId));
    if (mostFrequent) {
      return mostFrequent;
    }
  }
  const expenses = transactions.filter(recent).filter(isExpense);
  const [mostFrequent] = uniqMostFrequent(expenses.map(t => t.categoryId));
  if (mostFrequent) {
    return mostFrequent;
  }
  // If there are no expenses at all, the most frequent value will not be defined,
  // so fall back to the first category in that case.
  return categories[0].id;
}
