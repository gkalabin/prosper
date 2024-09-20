import {uniqMostFrequentIgnoringEmpty} from '@/lib/collections';
import {
  otherPartyNameOrNull,
  Transaction,
} from '@/lib/model/transaction/Transaction';
import {
  TransactionLink,
  TransactionLinkType,
} from '@/lib/model/TransactionLink';

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

export function mostFrequentPayer(transactions: Transaction[]): string | null {
  const maybeEmptyPayers = transactions.map(t =>
    t.kind != 'ThirdPartyExpense' ? null : t.payer
  );
  const payers = uniqMostFrequentIgnoringEmpty(maybeEmptyPayers);
  if (payers.length > 0) {
    return payers[0];
  }
  return null;
}

export function mostFrequentRepaymentCategory(
  transactionLinks: TransactionLink[]
): number | null {
  const links = transactionLinks.filter(
    l => l.linkType == TransactionLinkType.DEBT_SETTLING
  );
  if (links.length == 0) {
    return null;
  }
  const [categoryId] = uniqMostFrequentIgnoringEmpty(
    links.map(l => l.linked.categoryId)
  );
  return categoryId || null;
}
