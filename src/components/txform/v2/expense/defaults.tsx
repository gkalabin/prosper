import {
  ExpenseFormSchema,
  RepaymentTransactionFormSchema,
} from '@/components/txform/v2/expense/types';
import {IncomeFormSchema} from '@/components/txform/v2/income/types';
import {TransferFormSchema} from '@/components/txform/v2/transfer/types';
import {assert} from '@/lib/assert';
import {uniqMostFrequent} from '@/lib/collections';
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {ownShareAmountCentsIgnoreRefuds} from '@/lib/model/transaction/amounts';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {ThirdPartyExpense} from '@/lib/model/transaction/ThirdPartyExpense';
import {
  Transaction,
  isExpense,
  isPersonalExpense,
  isThirdPartyExpense,
  transactionTags,
  transactionTrip,
} from '@/lib/model/transaction/Transaction';
import {
  TransactionLink,
  TransactionLinkType,
} from '@/lib/model/TransactionLink';
import {Trip} from '@/lib/model/Trip';
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
    currency: null,
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
    currency: null,
    repayment: null,
  };
  return values;
}

export function expenseFromTransaction({
  expense: t,
  allTags,
  allTrips,
  allLinks,
}: {
  expense: PersonalExpense | ThirdPartyExpense;
  allTags: Tag[];
  allTrips: Trip[];
  allLinks: TransactionLink[];
}): ExpenseFormSchema {
  const tags = transactionTags(t, allTags);
  const trip = transactionTrip(t, allTrips);
  const commonFields = {
    timestamp: new Date(t.timestampEpoch),
    amount: t.amountCents / 100,
    ownShareAmount: ownShareAmountCentsIgnoreRefuds(t) / 100,
    vendor: t.vendor,
    categoryId: t.categoryId,
    tagNames: tags.map(t => t.name),
    description: t.note,
    tripName: trip?.name ?? null,
    companion: t.companions[0]?.name ?? null,
  };
  if (isThirdPartyExpense(t)) {
    const repayment = findRepayment({expense: t, allLinks});
    return {
      ...commonFields,
      sharingType: repayment ? 'PAID_OTHER_REPAID' : 'PAID_OTHER_OWED',
      payer: t.payer,
      currency: t.currencyCode,
      repayment,
      accountId: null,
    };
  }
  const _exhaustiveCheck: PersonalExpense = t;
  assert(_exhaustiveCheck.kind == 'PersonalExpense');
  return {
    ...commonFields,
    accountId: t.accountId,
    sharingType:
      t.companions.length > 0 ? 'PAID_SELF_SHARED' : 'PAID_SELF_NOT_SHARED',
    payer: null,
    currency: null,
    repayment: null,
  };
}

function findRepayment({
  expense: t,
  allLinks,
}: {
  expense: PersonalExpense | ThirdPartyExpense;
  allLinks: TransactionLink[];
}): RepaymentTransactionFormSchema | null {
  const repaymentLink = allLinks.find(
    l => l.linkType == TransactionLinkType.DEBT_SETTLING && l.source.id == t.id
  );
  if (!repaymentLink) {
    return null;
  }
  const repayment = repaymentLink.linked;
  if (!isPersonalExpense(repayment)) {
    throw new Error(`Repayment ${repayment.id} is not a personal expense`);
  }
  return {
    timestamp: new Date(repayment.timestampEpoch),
    accountId: repayment.accountId,
    categoryId: repayment.categoryId,
  };
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
    currency: null,
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
    currency: null,
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
