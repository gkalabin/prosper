import {ExpenseFormSchema} from '@/components/txform/expense/types';
import {IncomeFormSchema} from '@/components/txform/income/types';
import {TransferFormSchema} from '@/components/txform/transfer/types';
import {assert} from '@/lib/assert';
import {BankAccount, firstVisibleAccountId} from '@/lib/model/BankAccount';
import {Category} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {transactionTags} from '@/lib/model/transaction/Transaction';
import {Transfer} from '@/lib/model/transaction/Transfer';
import {TransactionDraft} from '@/lib/grpc/gen/prosper/v1/ledger';
import {winnerId, winnerMoneyDollar} from '@/lib/txsuggestions/candidate';
import {
  draftAmountDollar,
  draftDescription,
  draftTagNames,
  draftTimestamp,
} from '@/lib/txsuggestions/draft';
import {nanosToDollar} from '@/lib/util/util';

export function expenseToTransfer({
  prev,
  bankAccounts,
}: {
  prev: ExpenseFormSchema;
  bankAccounts: BankAccount[];
}): TransferFormSchema {
  assert(bankAccounts.length > 0);
  return {
    timestamp: prev.timestamp,
    amountSent: prev.amount,
    amountReceived: prev.amount,
    categoryId: prev.categoryId,
    fromAccountId: prev.accountId ?? bankAccounts[0].id,
    toAccountId: prev.accountId ?? bankAccounts[0].id,
    description: prev.vendor,
    tagNames: [...prev.tagNames],
  };
}

export function incomeToTransfer({
  prev,
}: {
  prev: IncomeFormSchema;
}): TransferFormSchema {
  return {
    timestamp: prev.timestamp,
    amountSent: prev.amount,
    amountReceived: prev.amount,
    categoryId: prev.categoryId,
    fromAccountId: prev.accountId,
    toAccountId: prev.accountId,
    description: prev.payer,
    tagNames: [...prev.tagNames],
  };
}

// transferFromDraft maps a resolved draft's fields into the transfer
// form values; unset fields keep the form's plain defaults.
export function transferFromDraft({
  draft,
  categories,
  bankAccounts,
}: {
  draft: TransactionDraft;
  categories: Category[];
  bankAccounts: BankAccount[];
}): TransferFormSchema {
  assert(categories.length > 0);
  assert(bankAccounts.length > 0);
  const amountSent = draftAmountDollar(draft);
  const values: TransferFormSchema = {
    timestamp: draftTimestamp(draft),
    amountSent,
    amountReceived: winnerMoneyDollar(draft.amountReceived, amountSent),
    description: draftDescription(draft),
    categoryId: winnerId(draft.categoryId, categories[0].id),
    fromAccountId: winnerId(
      draft.accountFromId,
      firstVisibleAccountId(bankAccounts)
    ),
    toAccountId: winnerId(
      draft.accountToId,
      firstVisibleAccountId(bankAccounts)
    ),
    tagNames: draftTagNames(draft),
  };
  return values;
}

export function transferFromTransaction({
  transfer: t,
  allTags,
}: {
  transfer: Transfer;
  allTags: Tag[];
}): TransferFormSchema {
  const tags = transactionTags(t, allTags);
  const values: TransferFormSchema = {
    timestamp: new Date(t.timestampEpoch),
    amountSent: nanosToDollar(t.sentAmountNanos),
    amountReceived: nanosToDollar(t.receivedAmountNanos),
    description: t.note,
    categoryId: t.categoryId,
    fromAccountId: t.fromAccountId,
    toAccountId: t.toAccountId,
    tagNames: tags.map(t => t.name),
  };
  return values;
}
