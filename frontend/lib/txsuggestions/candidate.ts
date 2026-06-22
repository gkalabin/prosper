import {Timestamp} from '@/lib/grpc/gen/google/protobuf/timestamp';
import {
  FormType,
  FormTypeCandidate,
  IdCandidate,
  MoneyCandidate,
  SharingType,
  SharingTypeCandidate,
  StringCandidate,
  TimestampCandidate,
  TagsCandidate,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {nanosToDollar} from '@/lib/util/util';

// Every field's candidates share this shape: the value carried with the
// confidence that the user will record it.
interface Candidate {
  confidence: number;
}

// winner is the candidate the field resolves to: the most confident.
function winner<C extends Candidate>(cs: C[]): C | undefined {
  let best: C | undefined;
  for (const c of cs) {
    if (!best || c.confidence > best.confidence) {
      best = c;
    }
  }
  return best;
}

export function winnerString(cs: StringCandidate[]): string | undefined;
export function winnerString<F>(cs: StringCandidate[], f: F): string | F;
export function winnerString(cs: StringCandidate[], f?: unknown) {
  return winner(cs)?.value ?? f;
}

export function winnerId(cs: IdCandidate[]): number | undefined;
export function winnerId<F>(cs: IdCandidate[], f: F): number | F;
export function winnerId(cs: IdCandidate[], f?: unknown) {
  return winner(cs)?.value ?? f;
}

export function winnerMoneyNanos(cs: MoneyCandidate[]): bigint | undefined;
export function winnerMoneyNanos<F>(cs: MoneyCandidate[], f: F): bigint | F;
export function winnerMoneyNanos(cs: MoneyCandidate[], f?: unknown) {
  return winner(cs)?.valueNanos ?? f;
}

export function winnerMoneyDollar<F>(cs: MoneyCandidate[], f: F): number | F;
export function winnerMoneyDollar(cs: MoneyCandidate[], f?: unknown) {
  const nanos = winnerMoneyNanos(cs);
  return nanos === undefined ? f : nanosToDollar(nanos);
}

export function winnerTimestamp(
  cs: TimestampCandidate[]
): Timestamp | undefined {
  return winner(cs)?.value;
}

export function winnerFormType(cs: FormTypeCandidate[]): FormType | undefined {
  return winner(cs)?.value;
}

export function winnerSharingType(
  cs: SharingTypeCandidate[]
): SharingType | undefined {
  return winner(cs)?.value;
}

export function winnerTags<F>(cs: TagsCandidate[], f: F): string[] | F {
  return winner(cs)?.value?.names ?? f;
}
