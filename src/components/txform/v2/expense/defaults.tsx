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
import {differenceInMonths, format, startOfDay} from 'date-fns';

function toDateTimeLocal(d: Date | number) {
  // 2022-12-19T18:05:59
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

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
    timestamp: toDateTimeLocal(startOfDay(new Date())),
    amount: 0,
    ownShareAmount: 0,
    vendor: '',
    categoryId: mostFrequentCategory(transactions, categories),
    accountId: mostFrequentAccount(transactions, bankAccounts),
    tagNames: [],
    companion: null,
    description: null,
    tripName: null,
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
    companion: prev.companion,
    description: prev.description,
    tripName: null,
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
    companion: null,
    description: null,
    tripName: null,
  };
  return values;
}

// export function expenseFormDefaultsForTransaction({
//   t,
//   transactions,
//   bankAccounts,
//   tags,
// }: {
//   t: Transaction;
//   transactions: Transaction[];
//   bankAccounts: BankAccount[];
//   tags: Tag[];
// }): ExpenseFormSchema {
//   const common = {
//     timestamp: toDateTimeLocal(t.timestampEpoch),
//     categoryId: t.categoryId,
//     tagNames: transactionTags(t, tags).map(x => x.name),
//     description: t.note,
//   };
//   switch (t.kind) {
//     case 'PersonalExpense':
//       return {
//         ...common,
//         vendor: t.vendor,
//         accountId: t.accountId,
//         amount: t.amountCents / 100,
//         // TODO: move ownShareAmountCentsIgnoreRefuds to this file.
//         ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
//       };
//     case 'ThirdPartyExpense':
//       return {
//         ...common,
//         vendor: t.vendor,
//         // TODO: this is wrong, setup form to show that it's an external transaction.
//         accountId: mostFrequentAccount(transactions, bankAccounts),
//         amount: t.amountCents / 100,
//         // TODO: move ownShareAmountCentsIgnoreRefuds to this file.
//         ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
//       };
//     case 'Transfer':
//       return {
//         ...common,
//         vendor: t.note,
//         accountId: t.fromAccountId,
//         amount: t.sentAmountCents / 100,
//         ownShareAmount: t.sentAmountCents / 100,
//       };
//     case 'Income':
//       return {
//         ...common,
//         vendor: t.payer,
//         accountId: t.accountId,
//         amount: t.amountCents / 100,
//         // TODO: move ownShareAmountCentsIgnoreRefuds to this file.
//         ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
//       };
//     default:
//       const _exhaustiveCheck: never = t;
//       throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
//   }
// }

// export function expenseFormDefaults({
//   prev,
//   transactions,
//   bankAccounts,
//   tags,
// }: {
//   prev: TransactionFormSchema;
//   transactions: Transaction[];
//   bankAccounts: BankAccount[];
//   tags: Tag[];
// }): ExpenseFormSchema {
//   const common = {
//     timestamp: toDateTimeLocal(t.timestampEpoch),
//     categoryId: t.categoryId,
//     tagNames: transactionTags(t, tags).map(x => x.name),
//     description: t.note,
//   };
//   switch (t.kind) {
//     case 'PersonalExpense':
//       return {
//         ...common,
//         vendor: t.vendor,
//         accountId: t.accountId,
//         amount: t.amountCents / 100,
//         // TODO: move ownShareAmountCentsIgnoreRefuds to this file.
//         ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
//       };
//     case 'ThirdPartyExpense':
//       return {
//         ...common,
//         vendor: t.vendor,
//         // TODO: this is wrong, setup form to show that it's an external transaction.
//         accountId: mostFrequentAccount(transactions, bankAccounts),
//         amount: t.amountCents / 100,
//         // TODO: move ownShareAmountCentsIgnoreRefuds to this file.
//         ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
//       };
//     case 'Transfer':
//       return {
//         ...common,
//         vendor: t.note,
//         accountId: t.fromAccountId,
//         amount: t.sentAmountCents / 100,
//         ownShareAmount: t.sentAmountCents / 100,
//       };
//     case 'Income':
//       return {
//         ...common,
//         vendor: t.payer,
//         accountId: t.accountId,
//         amount: t.amountCents / 100,
//         // TODO: move ownShareAmountCentsIgnoreRefuds to this file.
//         ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
//       };
//     default:
//       const _exhaustiveCheck: never = t;
//       throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
//   }
// }

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
  categories: Category[]
) {
  assert(categories.length > 0);
  const expenses = transactions.filter(recent).filter(isExpense);
  const [mostFrequent] = uniqMostFrequent(expenses.map(t => t.categoryId));
  if (mostFrequent) {
    return mostFrequent;
  }
  // If there are no expenses at all, the most frequent value will not be defined,
  // so fall back to the first category in that case.
  const categoryId = mostFrequent ?? categories[0].id;
  return categoryId;
}
