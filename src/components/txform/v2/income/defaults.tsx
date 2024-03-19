import {IncomeFormSchema, IncomeFormSchema} from '@/components/txform/v2/income/validation';
import { ExpenseFormSchema, TransferFormSchema } from '@/components/txform/v2/types';
import {assert, assertNotDefined} from '@/lib/assert';
import {uniqMostFrequent} from '@/lib/collections';
import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {
  Transaction,
  isIncome,
  transactionTags,
} from '@/lib/model/transaction/Transaction';
import {ownShareAmountCentsIgnoreRefuds} from '@/lib/model/transaction/amounts';
import {differenceInMonths, format, startOfDay} from 'date-fns';

function toDateTimeLocal(d: Date | number) {
  // 2022-12-19T18:05:59
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function useIncomeFormDefaults(t: Transaction | null): IncomeFormSchema {
  const {transactions, categories, bankAccounts, tags} =
    useAllDatabaseDataContext();
  if (!t) {
    return incomeFormDefaultsEmpty({transactions, categories, bankAccounts});
  }
  return incomeFormDefaultsForTransaction({
    t,
    transactions,
    bankAccounts,
    tags,
  });
}

export function incomeFormDefaultsEmpty({
  transactions,
  categories,
  bankAccounts,
}: {
  transactions: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
}): IncomeFormSchema {
  const values: IncomeFormSchema = {
    timestamp: toDateTimeLocal(startOfDay(new Date())),
    amount: 0,
    ownShareAmount: 0,
    payer: '',
    categoryId: mostFrequentCategory(transactions, categories),
    accountId: mostFrequentAccount(transactions, bankAccounts),
    tagNames: [],
    parentTransactionId: undefined,
  };
  return values;
}


export function incomeFormFromExistingForm({
  expense,
  income,
  transfer,
}: {
  expense?: ExpenseFormSchema;
  income?: IncomeFormSchema;
  transfer?: TransferFormSchema;
}): IncomeFormSchema {
  if (expense) {
    assertNotDefined(income);
    assertNotDefined(transfer);
    return expense;
  }
  if (income) {
    assertNotDefined(expense);
    assertNotDefined(transfer);
    return income;
  }
  if (transfer) {
    assertNotDefined(expense);
    assertNotDefined(income);
    return incomeFormFromTransfer(transfer);
  }
  throw new Error(`Previous form is required`);
}


export function incomeFormFromExpense(
  prev: ExpenseFormSchema
): IncomeFormSchema {
  const values: IncomeFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amountSent,
    ownShareAmount: prev.amountSent,
    vendor: prev.description ?? '',
    categoryId: prev.categoryId,
    accountId: prev.fromAccountId,
    tagNames: [],
    companion: undefined,
    description: undefined,
    tripName: undefined,
  };
  return values;
}

export function incomeFormFromTransfer(
  prev: TransferFormSchema
): IncomeFormSchema {
  const values: IncomeFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amountSent,
    ownShareAmount: prev.amountSent,
    vendor: prev.description ?? '',
    categoryId: prev.categoryId,
    accountId: prev.fromAccountId,
    tagNames: [],
    companion: undefined,
    description: undefined,
    tripName: undefined,
  };
  return values;
}

export function incomeFormDefaultsForTransaction({
  t,
  transactions,
  bankAccounts,
  tags,
}: {
  t: Transaction;
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  tags: Tag[];
}): IncomeFormSchema {
  const common = {
    timestamp: toDateTimeLocal(t.timestampEpoch),
    categoryId: t.categoryId,
    tagNames: transactionTags(t, tags).map(x => x.name),
    description: t.note,
  };
  switch (t.kind) {
    case 'PersonalExpense':
      return {
        ...common,
        payer: t.vendor,
        accountId: t.accountId,
        amount: t.amountCents / 100,
        // TODO: move ownShareAmountCentsIgnoreRefuds to this file.
        ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
      };
    case 'ThirdPartyExpense':
      return {
        ...common,
        payer: t.vendor,
        // TODO: this is wrong, setup form to show that it's an external transaction.
        accountId: mostFrequentAccount(transactions, bankAccounts),
        amount: t.amountCents / 100,
        // TODO: move ownShareAmountCentsIgnoreRefuds to this file.
        ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
      };
    case 'Transfer':
      return {
        ...common,
        payer: t.note,
        accountId: t.fromAccountId,
        amount: t.sentAmountCents / 100,
        ownShareAmount: t.sentAmountCents / 100,
      };
    case 'Income':
      return {
        ...common,
        payer: t.payer,
        accountId: t.accountId,
        amount: t.amountCents / 100,
        // TODO: move ownShareAmountCentsIgnoreRefuds to this file.
        ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
        // TODO: support array of refunds.
        parentTransactionId: t.refundGroupTransactionIds[0],
      };
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
  }
}

function mostFrequentAccount(
  transactions: Transaction[],
  bankAccounts: BankAccount[]
) {
  assert(bankAccounts.length > 0);
  const [mostFrequent] = uniqMostFrequent(
    transactions.filter(isIncome).map(t => t.accountId)
  );
  if (mostFrequent) {
    return mostFrequent;
  }
  // If there are no income transactions at all, the most frequent value will not be defined,
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
  const income = transactions.filter(recent).filter(isIncome);
  const [mostFrequent] = uniqMostFrequent(income.map(t => t.categoryId));
  if (mostFrequent) {
    return mostFrequent;
  }
  // If there are no income transactions at all, the most frequent value will not be defined,
  // so fall back to the first category in that case.
  const categoryId = mostFrequent ?? categories[0].id;
  return categoryId;
}
