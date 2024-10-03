import {assert} from '@/lib/assert';
import {uniqMostFrequentIgnoringEmpty} from '@/lib/collections';
import {BankAccount} from '@/lib/model/BankAccount';
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

export function mostFrequentRepaymentCategories(
  transactionLinks: TransactionLink[]
): number[] {
  const links = transactionLinks.filter(
    l => l.linkType == TransactionLinkType.DEBT_SETTLING
  );
  if (links.length == 0) {
    return [];
  }
  return uniqMostFrequentIgnoringEmpty(links.map(l => l.linked.categoryId));
}

export function mostFrequentBankAccount({
  transactions,
  bankAccounts,
  transactionToAccountId,
}: {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  transactionToAccountId: (t: Transaction) => number | null;
}) {
  assert(bankAccounts.length > 0);
  const [mostFrequent] = uniqMostFrequentIgnoringEmpty(
    transactions.map(transactionToAccountId)
  );
  if (mostFrequent) {
    return mostFrequent;
  }
  // If no relevant transactions found, the most frequent value will not be defined,
  // so fall back to the first visible account in that case.
  const accountId =
    bankAccounts.filter(a => !a.archived)[0]?.id ?? bankAccounts[0].id;
  return accountId;
}
