import {
  ExpenseFormSchema,
  RepaymentTransactionFormSchema,
} from '@/components/txform/expense/types';
import {IncomeFormSchema} from '@/components/txform/income/types';
import {
  mostFrequentBankAccount,
  mostFrequentCompanion,
} from '@/components/txform/prefill';
import {
  isRecent,
  matchesVendor,
  topCategoriesMatchMost,
} from '@/components/txform/shared/useTopCategoryIds';
import {TransferFormSchema} from '@/components/txform/transfer/types';
import {assert} from '@/lib/assert';
import {BankAccount} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {ownShareAmountCentsIgnoreRefunds} from '@/lib/model/transaction/amounts';
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
import {TransactionLink} from '@/lib/model/TransactionLink';
import {Trip} from '@/lib/model/Trip';
import {WithdrawalPrototype} from '@/lib/txsuggestions/TransactionPrototype';
import {centsToDollar} from '@/lib/util/util';
import {startOfDay} from 'date-fns';

export function expenseFormEmpty({
  transactions,
  categories,
  bankAccounts,
  accountId,
}: {
  transactions: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
  accountId?: number | null;
}): ExpenseFormSchema {
  // If there are no expenses at all, the most frequent value will not be defined,
  // so fall back to the first category in that case.
  assert(categories.length > 0);
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isExpense, isRecent],
      want: 1,
    })[0] ?? categories[0].id;
  const values: ExpenseFormSchema = {
    timestamp: startOfDay(new Date()),
    amount: 0,
    ownShareAmount: 0,
    vendor: '',
    categoryId,
    accountId:
      accountId ??
      mostFrequentBankAccount({
        transactions,
        bankAccounts,
        transactionToAccountId: t =>
          isPersonalExpense(t) ? t.accountId : null,
      }),
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
  bankAccounts,
}: {
  proto: WithdrawalPrototype;
  transactions: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
}): ExpenseFormSchema {
  const account = bankAccounts.find(a => a.id == proto.internalAccountId);
  const shared = account?.joint ?? false;
  const companion = shared ? mostFrequentCompanion(transactions) : null;
  // If there are no expenses at all, the most frequent value will not be defined,
  // so fall back to the first category in that case.
  assert(categories.length > 0);
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isExpense, matchesVendor(proto.description), isRecent],
      want: 1,
    })[0] ?? categories[0].id;
  const values: ExpenseFormSchema = {
    timestamp: new Date(proto.timestampEpoch),
    amount: centsToDollar(proto.absoluteAmountCents),
    ownShareAmount: centsToDollar(
      shared ? proto.absoluteAmountCents / 2 : proto.absoluteAmountCents
    ),
    vendor: proto.description,
    categoryId,
    accountId: proto.internalAccountId,
    sharingType: shared ? 'PAID_SELF_SHARED' : 'PAID_SELF_NOT_SHARED',
    companion,
    tagNames: [],
    description: null,
    tripName: null,
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
    ownShareAmount: ownShareAmountCentsIgnoreRefunds(t) / 100,
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
  const link = allLinks
    .filter(l => l.kind == 'DEBT_SETTLING')
    .find(l => l.expense.id == t.id);
  if (!link) {
    return null;
  }
  return {
    timestamp: new Date(link.repayment.timestampEpoch),
    accountId: link.repayment.accountId,
    categoryId: link.repayment.categoryId,
  };
}

export function incomeToExpense({
  prev,
  transactions,
}: {
  prev: IncomeFormSchema;
  transactions: Transaction[];
}): ExpenseFormSchema {
  // Prefer the most frequent category based on the new vendor value.
  // When switching the form type the user is expecting to see changes in the form and the
  // most frequent value is more likely to be useful compared to the previous mode's category.
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isExpense, matchesVendor(prev.payer), isRecent],
      want: 1,
    })[0] ?? prev.categoryId;
  const values: ExpenseFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amount,
    ownShareAmount: prev.ownShareAmount,
    vendor: prev.payer,
    categoryId,
    accountId: prev.accountId,
    tagNames: prev.tagNames,
    sharingType: prev.companion ? 'PAID_SELF_SHARED' : 'PAID_SELF_NOT_SHARED',
    description: null,
    tripName: null,
    companion: prev.companion,
    payer: null,
    currency: null,
    repayment: null,
  };
  return values;
}

export function transferToExpense({
  prev,
  transactions,
}: {
  prev: TransferFormSchema;
  transactions: Transaction[];
}): ExpenseFormSchema {
  const vendor = prev.description ?? '';
  // Prefer the most frequent category based on the new vendor value.
  // When switching the form type the user is expecting to see changes in the form and the
  // most frequent value is more likely to be useful compared to the previous mode's category.
  const categoryId =
    topCategoriesMatchMost({
      transactions,
      filters: [isExpense, matchesVendor(vendor), isRecent],
      want: 1,
    })[0] ?? prev.categoryId;
  const values: ExpenseFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amountSent,
    ownShareAmount: prev.amountSent,
    vendor,
    categoryId,
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
