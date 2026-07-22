import {FormType, TransactionDraft} from '@/lib/grpc/gen/prosper/v1/ledger';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {assertDefined} from '@/lib/assert';
import {Bank, BankAccount, fullAccountName} from '@/lib/model/BankAccount';
import {
  Transaction,
  otherPartyNameOrNull,
} from '@/lib/model/transaction/Transaction';
import {
  incomingBankAccount,
  outgoingBankAccount,
} from '@/lib/model/transaction/Transfer';
import {
  winnerId,
  winnerMoneyNanos,
  winnerString,
  winnerTimestamp,
} from '@/lib/txsuggestions/candidate';
import {draftFormType} from '@/lib/txsuggestions/draft';

export function draftTimestampEpoch(draft: TransactionDraft): number {
  const timestamp = winnerTimestamp(draft.timestamp);
  return timestamp ? timestampToEpoch(timestamp) : 0;
}

// groupDraftsByAccountId indexes drafts by each account they belong to, so a
// draft touching two accounts (e.g. a transfer) appears under both.
export function groupDraftsByAccountId(
  drafts: TransactionDraft[]
): Map<number, TransactionDraft[]> {
  const byAccount = new Map<number, TransactionDraft[]>();
  const append = (accountId: number, draft: TransactionDraft) => {
    const accountDrafts = byAccount.get(accountId) ?? [];
    byAccount.set(accountId, [...accountDrafts, draft]);
  };
  for (const draft of drafts) {
    const accountFromId = winnerId(draft.accountFromId);
    if (accountFromId) {
      append(accountFromId, draft);
    }
    const accountToId = winnerId(draft.accountToId);
    if (accountToId) {
      append(accountToId, draft);
    }
  }
  return byAccount;
}

// signedAmountForAccountNanos returns the draft's amount relative to one of
// its accounts: positive when money enters the account, negative when it leaves.
export function signedAmountForAccountNanos(
  draft: TransactionDraft,
  accountId: number
): bigint {
  const formType = draftFormType(draft);
  switch (formType) {
    case FormType.INCOME:
      // Income is deposited into the account.
      return winnerMoneyNanos(draft.amount, 0n);
    case FormType.EXPENSE:
      // An expense is paid out of the account.
      return -winnerMoneyNanos(draft.amount, 0n);
    case FormType.TRANSFER: {
      // A transfer credits the receiving account the amount received and
      // debits the sending account the amount sent.
      if (winnerId(draft.accountToId) == accountId) {
        const receivedNanos = winnerMoneyNanos(draft.amountReceived);
        assertDefined(receivedNanos);
        return receivedNanos;
      }
      return -winnerMoneyNanos(draft.amount, 0n);
    }
    default:
      throw new Error(`Cannot compute signed amount for form type ${formType}`);
  }
}

// draftTitle is the suggestion row's headline: the name the draft proposes for
// the field the form will show it in.
export function draftTitle(draft: TransactionDraft): string {
  switch (draftFormType(draft)) {
    case FormType.INCOME:
      return winnerString(draft.payer, '');
    case FormType.TRANSFER:
      return winnerString(draft.description, '');
    default:
      return winnerString(draft.vendor, '');
  }
}

// recordedSummary describes the transaction a draft was recorded as, shown on a
// dimmed row after it has been added.
export function recordedSummary(
  t: Transaction,
  bankAccounts: BankAccount[],
  banks: Bank[]
): string {
  switch (t.kind) {
    case 'PersonalExpense':
      return `${t.vendor}${
        otherPartyNameOrNull(t) ? ' split with ' + otherPartyNameOrNull(t) : ''
      }`;
    case 'ThirdPartyExpense':
      return `${t.vendor} paid by ${t.payer}`;
    case 'Income':
      return `${t.payer}${
        otherPartyNameOrNull(t) ? ' split with ' + otherPartyNameOrNull(t) : ''
      }`;
    case 'Transfer': {
      const from = outgoingBankAccount(t, bankAccounts);
      const to = incomingBankAccount(t, bankAccounts);
      return `${fullAccountName(from, banks)} → ${fullAccountName(to, banks)}`;
    }
    case 'OpeningBalance':
      throw new Error(
        `Opening balance transaction cannot be linked, but found ${t.id}`
      );
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`Unknown transaction type for ${_exhaustiveCheck}`);
  }
}
