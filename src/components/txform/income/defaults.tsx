import {ExpenseFormSchema} from '@/components/txform/expense/types';
import {IncomeFormSchema} from '@/components/txform/income/types';
import {mostFrequentBankAccount} from '@/components/txform/prefill';
import {
  isRecent,
  matchesPayer,
  topCategoriesMatchMost,
} from '@/components/txform/shared/useTopCategoryIds';
import {TransferFormSchema} from '@/components/txform/transfer/types';
import {assert} from '@/lib/assert';
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {ownShareAmountCentsIgnoreRefunds} from '@/lib/model/transaction/amounts';
import {Income} from '@/lib/model/transaction/Income';
import {
  isIncome,
  Transaction,
  transactionTags,
} from '@/lib/model/transaction/Transaction';
import {TransactionLink} from '@/lib/model/TransactionLink';
import {DepositPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {centsToDollar} from '@/lib/util/util';
import {startOfDay} from 'date-fns';

export function incomeFormEmpty({
  transactions,
  bankAccounts,
  categories,
}: {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  categories: Category[];
}): IncomeFormSchema {
  assert(bankAccounts.length > 0);
  assert(categories.length > 0);
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isIncome, isRecent],
      want: 1,
    })[0] ?? categories[0].id;
  const values: IncomeFormSchema = {
    timestamp: startOfDay(new Date()),
    amount: 0,
    ownShareAmount: 0,
    payer: '',
    categoryId,
    accountId: mostFrequentBankAccount({
      transactions,
      bankAccounts,
      transactionToAccountId: t => (isIncome(t) ? t.accountId : null),
    }),
    tagNames: [],
    companion: null,
    description: null,
    parentTransactionId: null,
    isShared: false,
  };
  return values;
}

export function expenseToIncome({
  prev,
  bankAccounts,
  transactions,
}: {
  prev: ExpenseFormSchema;
  bankAccounts: BankAccount[];
  transactions: Transaction[];
}): IncomeFormSchema {
  assert(bankAccounts.length > 0);
  // Prefer the most frequent category based on the new payer value.
  // When switching the form type the user is expecting to see changes in the form and the
  // most frequent value is more likely to be useful compared to the previous mode's category.
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isIncome, matchesPayer(prev.vendor), isRecent],
      want: 1,
    })[0] ?? prev.categoryId;
  const values: IncomeFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amount,
    ownShareAmount: prev.ownShareAmount,
    payer: prev.vendor,
    categoryId,
    accountId: prev.accountId ?? bankAccounts[0].id,
    tagNames: [],
    companion: prev.companion,
    description: prev.description,
    parentTransactionId: null,
    isShared: prev.sharingType != 'PAID_SELF_NOT_SHARED',
  };
  return values;
}

export function transferToIncome({
  prev,
  transactions,
}: {
  prev: TransferFormSchema;
  transactions: Transaction[];
}): IncomeFormSchema {
  const payer = prev.description ?? '';
  // Prefer the most frequent category based on the new payer value.
  // When switching the form type the user is expecting to see changes in the form and the
  // most frequent value is more likely to be useful compared to the previous mode's category.
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isIncome, matchesPayer(payer), isRecent],
      want: 1,
    })[0] ?? prev.categoryId;
  const values: IncomeFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amountSent,
    ownShareAmount: prev.amountSent,
    payer,
    categoryId,
    accountId: prev.fromAccountId,
    tagNames: [],
    companion: null,
    description: null,
    parentTransactionId: null,
    isShared: false,
  };
  return values;
}

export function incomeFromTransaction({
  income: t,
  allLinks,
  allTags,
}: {
  income: Income;
  allLinks: TransactionLink[];
  allTags: Tag[];
}): IncomeFormSchema {
  const tags = transactionTags(t, allTags);
  const refunds = allLinks.find(
    l => l.kind == 'REFUND' && l.refunds.some(r => r.id == t.id)
  );
  const values: IncomeFormSchema = {
    timestamp: new Date(t.timestampEpoch),
    amount: t.amountCents / 100,
    ownShareAmount: ownShareAmountCentsIgnoreRefunds(t) / 100,
    payer: t.payer,
    categoryId: t.categoryId,
    accountId: t.accountId,
    tagNames: tags.map(t => t.name),
    description: t.note,
    companion: t.companions[0]?.name ?? null,
    parentTransactionId: refunds?.expense.id ?? null,
    isShared: t.companions.length > 0,
  };
  return values;
}

export function incomeFromPrototype({
  proto,
  transactions,
  categories,
  bankAccounts,
}: {
  proto: DepositPrototype;
  transactions: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
}): IncomeFormSchema {
  const account = bankAccounts.find(a => a.id == proto.internalAccountId);
  const isShared = account?.joint ?? false;
  const payer = proto.description;
  // If there are no income transactions at all, the most frequent value will not be defined,
  // so fall back to the first category in that case.
  assert(categories.length > 0);
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isIncome, matchesPayer(payer), isRecent],
      want: 1,
    })[0] ?? categories[0].id;
  const values: IncomeFormSchema = {
    timestamp: new Date(proto.timestampEpoch),
    amount: centsToDollar(proto.absoluteAmountCents),
    ownShareAmount: centsToDollar(
      isShared ? proto.absoluteAmountCents / 2 : proto.absoluteAmountCents
    ),
    payer,
    categoryId,
    accountId: proto.internalAccountId,
    isShared,
    tagNames: [],
    description: null,
    companion: null,
    parentTransactionId: null,
  };
  return values;
}
