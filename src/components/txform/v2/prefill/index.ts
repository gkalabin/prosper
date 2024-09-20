import {uniqMostFrequentIgnoringEmpty} from '@/lib/collections';
import {
  otherPartyNameOrNull,
  Transaction,
} from '@/lib/model/transaction/Transaction';

export function mostFrequentCompanion(
  transactions: Transaction[]
): string | null {
  const companions = uniqMostFrequentIgnoringEmpty(
    transactions.map(otherPartyNameOrNull)
  );
  if (companions.length > 0) {
    return companions[0];
  }
  return null;
}
