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
import {differenceInMonths} from 'date-fns';

export function expenseToIncome(
  prev: ExpenseFormSchema,
  bankAccounts: BankAccount[]
): IncomeFormSchema {
  assert(bankAccounts.length > 0);
  const values: IncomeFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amount,
    ownShareAmount: prev.ownShareAmount,
    payer: prev.vendor,
    categoryId: prev.categoryId,
    accountId: prev.accountId ?? bankAccounts[0].id,
    tagNames: [],
    companion: prev.companion,
    description: prev.description,
    parentTransactionId: null,
    isShared: prev.sharingType != 'PAID_SELF_NOT_SHARED',
  };
  return values;
}

export function transferToIncome(prev: TransferFormSchema): IncomeFormSchema {
  const values: IncomeFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amountSent,
    ownShareAmount: prev.amountSent,
    payer: prev.description ?? '',
    categoryId: prev.categoryId,
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
}: {
  proto: DepositPrototype;
  transactions: Transaction[];
  categories: Category[];
}): IncomeFormSchema {
  const values: IncomeFormSchema = {
    timestamp: new Date(proto.timestampEpoch),
    amount: proto.absoluteAmountCents / 100,
    ownShareAmount: 0,
    payer: proto.description,
    categoryId: mostFrequentCategory(
      transactions,
      categories,
      proto.description
    ),
    accountId: proto.internalAccountId,
    tagNames: [],
    description: null,
    companion: null,
    parentTransactionId: null,
    isShared: false,
  };
  return values;
}

function recent(t: Transaction): boolean {
  const now = new Date();
  return differenceInMonths(now, t.timestampEpoch) < 3;
}

function mostFrequentCategory(
  transactions: Transaction[],
  categories: Category[],
  payer: string | null
) {
  assert(categories.length > 0);
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
  // If there are no income transactions at all, the most frequent value will not be defined,
  // so fall back to the first category in that case.
  return categories[0].id;
}
