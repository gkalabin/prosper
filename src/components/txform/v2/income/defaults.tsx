import {ExpenseFormSchema} from '@/components/txform/v2/expense/types';
import {IncomeFormSchema} from '@/components/txform/v2/income/types';
import {TransferFormSchema} from '@/components/txform/v2/transfer/types';
import {assert} from '@/lib/assert';
import {uniqMostFrequent} from '@/lib/collections';
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {ownShareAmountCentsIgnoreRefuds} from '@/lib/model/transaction/amounts';
import {Income} from '@/lib/model/transaction/Income';
import {
  isIncome,
  Transaction,
  transactionTags,
} from '@/lib/model/transaction/Transaction';
import {
  TransactionLink,
  TransactionLinkType,
} from '@/lib/model/TransactionLink';
import {DepositPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {centsToDollar} from '@/lib/util/util';
import {differenceInMonths} from 'date-fns';

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
    mostFrequentCategory(transactions, prev.vendor) ?? prev.categoryId;
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
  // Prefer the most frequent category based on the new payer value.
  // When switching the form type the user is expecting to see changes in the form and the
  // most frequent value is more likely to be useful compared to the previous mode's category.
  const categoryId =
    mostFrequentCategory(transactions, prev.description) ?? prev.categoryId;
  const values: IncomeFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amountSent,
    ownShareAmount: prev.amountSent,
    payer: prev.description ?? '',
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
  const link = allLinks.find(
    l => l.linkType == TransactionLinkType.REFUND && l.linked.id == t.id
  );
  const values: IncomeFormSchema = {
    timestamp: new Date(t.timestampEpoch),
    amount: t.amountCents / 100,
    ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
    payer: t.payer,
    categoryId: t.categoryId,
    accountId: t.accountId,
    tagNames: tags.map(t => t.name),
    description: t.note,
    companion: t.companions[0]?.name ?? null,
    parentTransactionId: link?.linked.id ?? null,
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
  // If there are no income transactions at all, the most frequent value will not be defined,
  // so fall back to the first category in that case.
  assert(categories.length > 0);
  const categoryId =
    mostFrequentCategory(transactions, proto.description) ?? categories[0].id;
  const values: IncomeFormSchema = {
    timestamp: new Date(proto.timestampEpoch),
    amount: centsToDollar(proto.absoluteAmountCents),
    ownShareAmount: centsToDollar(
      isShared ? proto.absoluteAmountCents / 2 : proto.absoluteAmountCents
    ),
    payer: proto.description,
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

function recent(t: Transaction): boolean {
  const now = new Date();
  return differenceInMonths(now, t.timestampEpoch) < 3;
}

function mostFrequentCategory(
  transactions: Transaction[],
  payer: string | null
): number | null {
  if (payer) {
    const expenses = transactions
      .filter(isIncome)
      .filter(t => t.payer == payer);
    const [mostFrequent] = uniqMostFrequent(expenses.map(t => t.categoryId));
    if (mostFrequent) {
      return mostFrequent;
    }
  }
  const income = transactions.filter(recent).filter(isIncome);
  const [mostFrequent] = uniqMostFrequent(income.map(t => t.categoryId));
  if (mostFrequent) {
    return mostFrequent;
  }
  return null;
}
