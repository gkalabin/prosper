import {
  FormType,
  OriginKey,
  TransactionDraft,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {timestampToDate} from '@/lib/grpc/timestamp';
import {
  winnerFormType,
  winnerMoneyNanos,
  winnerString,
  winnerTags,
  winnerTimestamp,
} from '@/lib/txsuggestions/candidate';
import {nanosToDollar} from '@/lib/util/util';
import {startOfDay} from 'date-fns';

// draftTimestamp returns the timestamp a draft proposes, defaulting to
// the start of today when it proposes none.
export function draftTimestamp(draft: TransactionDraft): Date {
  const timestamp = winnerTimestamp(draft.timestamp);
  return timestamp ? timestampToDate(timestamp) : startOfDay(new Date());
}

// draftAmountDollar returns the amount a draft proposes in dollars,
// defaulting to zero.
export function draftAmountDollar(draft: TransactionDraft): number {
  return nanosToDollar(winnerMoneyNanos(draft.amount, 0n));
}

// draftTagNames returns the tag names a draft proposes.
export function draftTagNames(draft: TransactionDraft): string[] {
  return winnerTags(draft.tags, []);
}

// draftDescription returns the description a draft proposes, or null.
export function draftDescription(draft: TransactionDraft): string | null {
  return winnerString(draft.description, null);
}

// draftFormType returns the form variant a draft opens with, falling
// back to the expense form when the draft doesn't say.
export function draftFormType(draft: TransactionDraft): FormType {
  const value = winnerFormType(draft.formType);
  if (
    value === FormType.INCOME ||
    value === FormType.TRANSFER ||
    value === FormType.EXPENSE
  ) {
    return value;
  }
  return FormType.EXPENSE;
}

// sameEvent reports whether two drafts describe the same event, i.e.
// their origins point at the same set of event ids.
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

// isRecorded reports whether the user already recorded a transaction
// from the draft's event.
export function isRecorded(draft: TransactionDraft): boolean {
  return draft.recordedTransactionIds.length > 0;
}
