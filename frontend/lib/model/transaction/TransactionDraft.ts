import {Amount} from '@/lib/Amount';
import {AmountWithUnit} from '@/lib/AmountWithUnit';
import {assert, assertDefined} from '@/lib/assert';
import {
  FormType,
  OriginKey,
  TransactionDraft,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {timestampToDate} from '@/lib/grpc/timestamp';
import {BankAccount, accountUnit} from '@/lib/model/BankAccount';
import {Stock} from '@/lib/model/Stock';
import {
  winnerFormType,
  winnerId,
  winnerMoneyNanos,
  winnerString,
  winnerTags,
  winnerTimestamp,
} from '@/lib/txsuggestions/candidate';

export function draftTimestamp(draft: TransactionDraft): Date {
  return timestampToDate(winnerTimestamp(draft.timestamp));
}

export function draftAmount(draft: TransactionDraft): Amount {
  return new Amount({amountNanos: winnerMoneyNanos(draft.amount, 0n)});
}

export function draftTagNames(draft: TransactionDraft): string[] {
  return winnerTags(draft.tags, []);
}

export function draftDescription(draft: TransactionDraft): string | null {
  return winnerString(draft.description, null);
}

export function draftFormType(
  draft: TransactionDraft
): Exclude<FormType, FormType.UNSPECIFIED> {
  const value = winnerFormType(draft.formType);
  if (value === undefined || value === FormType.UNSPECIFIED) {
    throw new Error(`Draft ${draftKey(draft)} has no form type`);
  }
  return value;
}

export function sameEvent(a: TransactionDraft, b: TransactionDraft): boolean {
  const aIds = originIds(a.origins);
  const bIds = originIds(b.origins);
  return (
    aIds.length > 0 &&
    aIds.length === bIds.length &&
    aIds.every((id, i) => id === bIds[i])
  );
}

function originIds(origins: OriginKey[]): string[] {
  return origins.map(o => `${o.kind}:${o.key}`).sort();
}

export function isRecorded(draft: TransactionDraft): boolean {
  return draft.recordedTransactionIds.length > 0;
}
export function draftKey(draft: TransactionDraft): string {
  return originIds(draft.origins).join(',');
}

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

// signedAmountForAccount returns how the draft moves the given account's balance.
export function signedAmountForAccount(
  draft: TransactionDraft,
  account: BankAccount,
  stocks: Stock[]
): AmountWithUnit {
  return new AmountWithUnit({
    amountNanos: signedNanosForAccount(draft, account.id),
    unit: accountUnit(account, stocks),
  });
}

function signedNanosForAccount(
  draft: TransactionDraft,
  accountId: number
): bigint {
  const formType = draftFormType(draft);
  switch (formType) {
    case FormType.INCOME:
      assert(
        winnerId(draft.accountToId) === accountId,
        `Account ${accountId} does not receive income draft`
      );
      return winnerMoneyNanos(draft.amount, 0n);
    case FormType.EXPENSE:
      assert(
        winnerId(draft.accountFromId) === accountId,
        `Account ${accountId} does not pay expense draft`
      );
      return -winnerMoneyNanos(draft.amount, 0n);
    case FormType.TRANSFER: {
      if (winnerId(draft.accountToId) === accountId) {
        const receivedNanos = winnerMoneyNanos(draft.amountReceived);
        assertDefined(receivedNanos);
        return receivedNanos;
      }
      assert(
        winnerId(draft.accountFromId) === accountId,
        `Account ${accountId} is neither side of transfer draft`
      );
      return -winnerMoneyNanos(draft.amount, 0n);
    }
    default:
      const _exhaustiveCheck: never = formType;
      throw new Error(
        `Cannot compute signed amount for form type ${_exhaustiveCheck}`
      );
  }
}
