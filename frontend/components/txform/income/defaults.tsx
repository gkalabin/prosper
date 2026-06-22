import {ExpenseFormSchema} from '@/components/txform/expense/types';
import {IncomeFormSchema} from '@/components/txform/income/types';
import {TransferFormSchema} from '@/components/txform/transfer/types';
import {assert} from '@/lib/assert';
import {BankAccount, firstVisibleAccountId} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {ownShareAmountNanosIgnoreRefunds} from '@/lib/model/transaction/amounts';
import {Income} from '@/lib/model/transaction/Income';
import {transactionTags} from '@/lib/model/transaction/Transaction';
import {TransactionLink} from '@/lib/model/TransactionLink';
import {
  SharingType as PbSharingType,
  TransactionDraft,
} from '@/lib/grpc/gen/prosper/v1/ledger';
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

export function expenseToIncome({
  prev,
  bankAccounts,
}: {
  prev: ExpenseFormSchema;
  bankAccounts: BankAccount[];
}): IncomeFormSchema {
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
    isShared: prev.sharingType != PbSharingType.PAID_SELF_NOT_SHARED,
  };
  return values;
}

export function transferToIncome({
  prev,
}: {
  prev: TransferFormSchema;
}): IncomeFormSchema {
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
  const refunds = allLinks.find(
    l => l.kind == 'REFUND' && l.refunds.some(r => r.id == t.id)
  );
  const values: IncomeFormSchema = {
    timestamp: new Date(t.timestampEpoch),
    amount: nanosToDollar(t.amountNanos),
    ownShareAmount: nanosToDollar(ownShareAmountNanosIgnoreRefunds(t)),
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

// incomeFromDraft maps a resolved draft's fields into the income form
// values; unset fields keep the form's plain defaults.
export function incomeFromDraft({
  draft,
  categories,
  bankAccounts,
}: {
  draft: TransactionDraft;
  categories: Category[];
  bankAccounts: BankAccount[];
}): IncomeFormSchema {
  assert(categories.length > 0);
  assert(bankAccounts.length > 0);
  const amount = draftAmountDollar(draft);
  const isShared =
    winnerSharingType(draft.sharingType) === PbSharingType.PAID_SELF_SHARED;
  const values: IncomeFormSchema = {
    timestamp: draftTimestamp(draft),
    amount,
    ownShareAmount: winnerMoneyDollar(draft.ownShareAmount, amount),
    payer: winnerString(draft.payer, ''),
    categoryId: winnerId(draft.categoryId, categories[0].id),
    accountId: winnerId(draft.accountToId, firstVisibleAccountId(bankAccounts)),
    isShared,
    tagNames: draftTagNames(draft),
    description: draftDescription(draft),
    companion: isShared ? winnerString(draft.companion, null) : null,
    parentTransactionId: winnerId(draft.parentTransactionId, null),
  };
  return values;
}
