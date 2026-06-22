import {
  ExpenseFormSchema,
  RepaymentTransactionFormSchema,
} from '@/components/txform/expense/types';
import {IncomeFormSchema} from '@/components/txform/income/types';
import {TransferFormSchema} from '@/components/txform/transfer/types';
import {assert} from '@/lib/assert';
import {BankAccount, firstVisibleAccountId} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {ownShareAmountNanosIgnoreRefunds} from '@/lib/model/transaction/amounts';
import {PersonalExpense} from '@/lib/model/transaction/PersonalExpense';
import {ThirdPartyExpense} from '@/lib/model/transaction/ThirdPartyExpense';
import {
  isThirdPartyExpense,
  transactionTags,
  transactionTrip,
} from '@/lib/model/transaction/Transaction';
import {TransactionLink} from '@/lib/model/TransactionLink';
import {Trip} from '@/lib/model/Trip';
import {SharingType, TransactionDraft} from '@/lib/grpc/gen/prosper/v1/ledger';
import {
  winnerId,
  winnerMoneyDollar,
  winnerSharingType,
  winnerString,
} from '@/lib/txsuggestions/candidate';
import {
  draftAmountDollar,
  draftDescription,
  draftTagNames,
  draftTimestamp,
} from '@/lib/txsuggestions/draft';
import {nanosToDollar} from '@/lib/util/util';
import {startOfDay} from 'date-fns';

export function expenseFormEmpty({
  categories,
  bankAccounts,
}: {
  categories: Category[];
  bankAccounts: BankAccount[];
}): ExpenseFormSchema {
  assert(categories.length > 0);
  assert(bankAccounts.length > 0);
  const values: ExpenseFormSchema = {
    timestamp: startOfDay(new Date()),
    amount: 0,
    ownShareAmount: 0,
    vendor: '',
    categoryId: categories[0].id,
    accountId: firstVisibleAccountId(bankAccounts),
    tagNames: [],
    sharingType: SharingType.PAID_SELF_NOT_SHARED,
    description: null,
    tripName: null,
    companion: null,
    payer: null,
    currency: null,
    repayment: null,
  };
  return values;
}

// expenseFromDraft maps a resolved draft's fields into the expense
// form values; unset fields keep the form's plain defaults.
export function expenseFromDraft({
  draft,
  categories,
  bankAccounts,
}: {
  draft: TransactionDraft;
  categories: Category[];
  bankAccounts: BankAccount[];
}): ExpenseFormSchema {
  assert(categories.length > 0);
  assert(bankAccounts.length > 0);
  const timestamp = draftTimestamp(draft);
  const amount = draftAmountDollar(draft);
  const proposedSharingType = winnerSharingType(draft.sharingType);
  const sharingType = proposedSharingType
    ? proposedSharingType
    : SharingType.PAID_SELF_NOT_SHARED;
  const shared = sharingType === SharingType.PAID_SELF_SHARED;
  const paidOther =
    sharingType === SharingType.PAID_OTHER_OWED ||
    sharingType === SharingType.PAID_OTHER_REPAID;
  const accountId = winnerId(
    draft.accountFromId,
    firstVisibleAccountId(bankAccounts)
  );
  const categoryId = winnerId(draft.categoryId, categories[0].id);
  let repayment: RepaymentTransactionFormSchema | null = null;
  if (sharingType === SharingType.PAID_OTHER_REPAID) {
    repayment = {
      timestamp,
      accountId,
      categoryId: winnerId(draft.repaymentCategoryId, categoryId),
    };
  }
  const values: ExpenseFormSchema = {
    timestamp,
    amount,
    ownShareAmount: winnerMoneyDollar(draft.ownShareAmount, amount),
    vendor: winnerString(draft.vendor, ''),
    categoryId,
    accountId: paidOther ? null : accountId,
    tagNames: draftTagNames(draft),
    sharingType,
    description: draftDescription(draft),
    tripName: winnerString(draft.tripName, null),
    companion: shared ? winnerString(draft.companion, null) : null,
    payer: paidOther ? winnerString(draft.payer, null) : null,
    currency: paidOther ? winnerString(draft.currency, null) : null,
    repayment,
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
    amount: nanosToDollar(t.amountNanos),
    ownShareAmount: nanosToDollar(ownShareAmountNanosIgnoreRefunds(t)),
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
      sharingType: repayment
        ? SharingType.PAID_OTHER_REPAID
        : SharingType.PAID_OTHER_OWED,
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
      t.companions.length > 0
        ? SharingType.PAID_SELF_SHARED
        : SharingType.PAID_SELF_NOT_SHARED,
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
}: {
  prev: IncomeFormSchema;
}): ExpenseFormSchema {
  const values: ExpenseFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amount,
    ownShareAmount: prev.ownShareAmount,
    vendor: prev.payer,
    categoryId: prev.categoryId,
    accountId: prev.accountId,
    tagNames: prev.tagNames,
    sharingType: prev.companion
      ? SharingType.PAID_SELF_SHARED
      : SharingType.PAID_SELF_NOT_SHARED,
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
}: {
  prev: TransferFormSchema;
}): ExpenseFormSchema {
  const values: ExpenseFormSchema = {
    timestamp: prev.timestamp,
    amount: prev.amountSent,
    ownShareAmount: prev.amountSent,
    vendor: prev.description ?? '',
    categoryId: prev.categoryId,
    accountId: prev.fromAccountId,
    tagNames: [],
    sharingType: SharingType.PAID_SELF_NOT_SHARED,
    description: null,
    tripName: null,
    companion: null,
    payer: null,
    currency: null,
    repayment: null,
  };
  return values;
}
