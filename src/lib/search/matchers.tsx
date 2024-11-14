import {Bank, BankAccount} from '@/lib/model/BankAccount';
import {CategoryTree, getNameWithAncestors} from '@/lib/model/Category';
import {Tag} from '@/lib/model/Tag';
import {Trip} from '@/lib/model/Trip';
import {
  Transaction,
  isExpense,
  isIncome,
  isPersonalExpense,
  isThirdPartyExpense,
  isTransfer,
  otherPartyName,
  transactionBank,
  transactionBankAccount,
  transactionTags,
  transactionTrip,
} from '@/lib/model/transaction/Transaction';
import {
  incomingBank,
  incomingBankAccount,
  outgoingBank,
  outgoingBankAccount,
} from '@/lib/model/transaction/Transfer';
import {parseAmountAsCents} from '@/lib/util/util';
import {format, isAfter, isBefore, isSameDay, parse} from 'date-fns';

export enum CaseMatch {
  Exact,
  CaseInsensitive,
}

export enum ComparisonOperator {
  LessThan,
  LessThanOrEqual,
  GreaterThan,
  GreaterThanOrEqual,
}

export function matchAnyField(
  t: Transaction,
  term: string,
  c: CaseMatch,
  banks: Bank[],
  bankAccounts: BankAccount[],
  categoryTree: CategoryTree,
  trips: Trip[],
  tags: Tag[]
): boolean {
  return (
    matchNote(t, term, c) ||
    matchVendor(t, term, c) ||
    matchPayer(t, term, c) ||
    matchOtherParty(t, term, c) ||
    matchAmount(t, term) ||
    matchTransactionId(t, term) ||
    matchBank(t, term, c, banks, bankAccounts) ||
    matchBankAccount(t, term, c, bankAccounts) ||
    matchCategory(t, term, c, categoryTree) ||
    matchTrip(t, term, c, trips) ||
    matchTag(t, term, c, tags) ||
    matchDate(t, term) ||
    matchType(t, term)
  );
}

export function matchField(
  t: Transaction,
  fieldName: string,
  term: string,
  c: CaseMatch,
  banks: Bank[],
  bankAccounts: BankAccount[],
  categoryTree: CategoryTree,
  trips: Trip[],
  tags: Tag[]
): boolean {
  if (includesIgnoreCase(fieldName, ['note', 'description', 'd'])) {
    return matchNote(t, term, c);
  }
  if (includesIgnoreCase(fieldName, ['vendor', 'payee', 'recipient', 'v'])) {
    return matchVendor(t, term, c);
  }
  if (includesIgnoreCase(fieldName, ['payer'])) {
    return matchPayer(t, term, c);
  }
  if (includesIgnoreCase(fieldName, ['otherParty', 'splitWith'])) {
    return matchOtherParty(t, term, c);
  }
  if (includesIgnoreCase(fieldName, ['amount', 'amt', 'price'])) {
    return matchAmount(t, term);
  }
  if (includesIgnoreCase(fieldName, ['id'])) {
    return matchTransactionId(t, term);
  }
  if (includesIgnoreCase(fieldName, ['bank', 'b'])) {
    return (
      matchBankId(t, term, bankAccounts) ||
      matchBank(t, term, c, banks, bankAccounts)
    );
  }
  if (includesIgnoreCase(fieldName, ['account', 'acc'])) {
    return (
      matchBankAccountId(t, term) || matchBankAccount(t, term, c, bankAccounts)
    );
  }
  if (includesIgnoreCase(fieldName, ['category', 'c'])) {
    return matchCategoryId(t, term) || matchCategory(t, term, c, categoryTree);
  }
  if (includesIgnoreCase(fieldName, ['trip'])) {
    return matchTripId(t, term) || matchTrip(t, term, c, trips);
  }
  if (includesIgnoreCase(fieldName, ['tag'])) {
    return matchTagId(t, term) || matchTag(t, term, c, tags);
  }
  if (includesIgnoreCase(fieldName, ['date', 'd', 'on'])) {
    return matchDate(t, term);
  }
  if (includesIgnoreCase(fieldName, ['type', 't'])) {
    return matchType(t, term);
  }
  return false;
}

export function compareField(
  t: Transaction,
  fieldName: string,
  op: ComparisonOperator,
  term: string
): boolean {
  if (includesIgnoreCase(fieldName, ['amount', 'amt', 'price'])) {
    return compareAmount(t, term, op);
  }
  if (includesIgnoreCase(fieldName, ['date', 'd'])) {
    return compareDate(t, term, op);
  }
  return false;
}

function matchNote(t: Transaction, term: string, c: CaseMatch): boolean {
  return includes(t.note, term, c);
}

function matchVendor(t: Transaction, term: string, c: CaseMatch): boolean {
  if (isTransfer(t) || isIncome(t)) {
    return false;
  }
  return includes(t.vendor, term, c);
}

function matchPayer(t: Transaction, term: string, c: CaseMatch): boolean {
  if (!isIncome(t)) {
    return false;
  }
  return includes(t.payer, term, c);
}

function matchOtherParty(t: Transaction, term: string, c: CaseMatch): boolean {
  if (isTransfer(t)) {
    return false;
  }
  const otherParty = otherPartyName(t);
  if (!otherParty) {
    return false;
  }
  return includes(otherParty, term, c);
}

function matchAmount(t: Transaction, term: string): boolean {
  const termCents = parseAmountAsCents(term);
  if (!termCents) {
    return false;
  }
  if (isTransfer(t)) {
    return t.sentAmountCents == termCents || t.receivedAmountCents == termCents;
  }
  return t.amountCents == termCents;
}

function compareAmount(
  t: Transaction,
  term: string,
  op: ComparisonOperator
): boolean {
  const termCents = parseAmountAsCents(term);
  if (!termCents) {
    return false;
  }
  if (isTransfer(t)) {
    switch (op) {
      case ComparisonOperator.LessThan:
        return (
          t.sentAmountCents < termCents || t.receivedAmountCents < termCents
        );
      case ComparisonOperator.LessThanOrEqual:
        return (
          t.sentAmountCents <= termCents || t.receivedAmountCents <= termCents
        );
      case ComparisonOperator.GreaterThan:
        return (
          t.sentAmountCents > termCents || t.receivedAmountCents > termCents
        );
      case ComparisonOperator.GreaterThanOrEqual:
        return (
          t.sentAmountCents >= termCents || t.receivedAmountCents >= termCents
        );
    }
  }
  switch (op) {
    case ComparisonOperator.LessThan:
      return t.amountCents < termCents;
    case ComparisonOperator.LessThanOrEqual:
      return t.amountCents <= termCents;
    case ComparisonOperator.GreaterThan:
      return t.amountCents > termCents;
    case ComparisonOperator.GreaterThanOrEqual:
      return t.amountCents >= termCents;
  }
}

function matchTransactionId(t: Transaction, term: string): boolean {
  return equals(t.id, term);
}

function matchBank(
  t: Transaction,
  term: string,
  c: CaseMatch,
  banks: Bank[],
  bankAccounts: BankAccount[]
): boolean {
  if (isThirdPartyExpense(t)) {
    return false;
  }
  if (isTransfer(t)) {
    const bankFrom = outgoingBank(t, banks, bankAccounts);
    if (includes(bankFrom.name, term, c)) {
      return true;
    }
    const bankTo = incomingBank(t, banks, bankAccounts);
    if (includes(bankTo.name, term, c)) {
      return true;
    }
    return false;
  }
  const bank = transactionBank(t, banks, bankAccounts);
  return includes(bank.name, term, c);
}

function matchBankId(
  t: Transaction,
  term: string,
  bankAccounts: BankAccount[]
): boolean {
  if (isThirdPartyExpense(t)) {
    return false;
  }
  if (isTransfer(t)) {
    const accountFrom = outgoingBankAccount(t, bankAccounts);
    const accountTo = incomingBankAccount(t, bankAccounts);
    return equals(accountFrom.bankId, term) || equals(accountTo.bankId, term);
  }
  const account = transactionBankAccount(t, bankAccounts);
  return equals(account.bankId, term);
}

function matchBankAccount(
  t: Transaction,
  term: string,
  c: CaseMatch,
  bankAccounts: BankAccount[]
): boolean {
  if (isThirdPartyExpense(t)) {
    return false;
  }
  if (isTransfer(t)) {
    const accountFrom = outgoingBankAccount(t, bankAccounts);
    if (includes(accountFrom.name, term, c)) {
      return true;
    }
    const accountTo = incomingBankAccount(t, bankAccounts);
    if (includes(accountTo.name, term, c)) {
      return true;
    }
    return false;
  }
  const account = transactionBankAccount(t, bankAccounts);
  return includes(account.name, term, c);
}

function matchBankAccountId(t: Transaction, term: string): boolean {
  if (isThirdPartyExpense(t)) {
    return false;
  }
  if (isTransfer(t)) {
    return equals(t.fromAccountId, term) || equals(t.toAccountId, term);
  }
  return equals(t.accountId, term);
}

function matchCategory(
  t: Transaction,
  term: string,
  c: CaseMatch,
  categoryTree: CategoryTree
): boolean {
  const name = getNameWithAncestors(t.categoryId, categoryTree);
  return includes(name, term, c);
}

function matchCategoryId(t: Transaction, term: string): boolean {
  return equals(t.categoryId, term);
}

function matchTrip(
  t: Transaction,
  term: string,
  c: CaseMatch,
  trips: Trip[]
): boolean {
  if (isTransfer(t) || !t.tripId) {
    return false;
  }
  const trip = transactionTrip(t, trips);
  if (!trip) {
    return false;
  }
  return includes(trip.name, term, c);
}

function matchTripId(t: Transaction, term: string): boolean {
  if (isTransfer(t) || !t.tripId) {
    return false;
  }
  return equals(t.tripId, term);
}

function matchTag(
  t: Transaction,
  term: string,
  c: CaseMatch,
  allTags: Tag[]
): boolean {
  const tags = transactionTags(t, allTags);
  for (const t of tags) {
    if (includes(t.name, term, c)) {
      return true;
    }
  }
  return false;
}

function matchTagId(t: Transaction, term: string): boolean {
  for (const tagId of t.tagsIds) {
    if (equals(tagId, term)) {
      return true;
    }
  }
  return false;
}

function matchDate(t: Transaction, term: string): boolean {
  if (!term.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return false;
  }
  return format(t.timestampEpoch, 'yyyy-MM-dd') == term;
}

function matchType(t: Transaction, term: string): boolean {
  if (includesIgnoreCase(term, ['transfer'])) {
    return isTransfer(t);
  }
  if (includesIgnoreCase(term, ['income'])) {
    return isIncome(t);
  }
  if (includesIgnoreCase(term, ['expense'])) {
    return isExpense(t);
  }
  if (includesIgnoreCase(term, ['personal'])) {
    return isPersonalExpense(t);
  }
  if (includesIgnoreCase(term, ['thirdParty', 'external'])) {
    return isThirdPartyExpense(t);
  }
  return false;
}

function compareDate(
  t: Transaction,
  term: string,
  op: ComparisonOperator
): boolean {
  const txDate = new Date(t.timestampEpoch);
  const termDate = parse(term, 'yyyy-MM-dd', new Date());
  switch (op) {
    case ComparisonOperator.LessThan:
      return isBefore(txDate, termDate);
    case ComparisonOperator.LessThanOrEqual:
      return isSameDay(txDate, termDate) || isBefore(txDate, termDate);
    case ComparisonOperator.GreaterThan:
      // Currently only date values are supported, so when user types date>2022-01-01
      // they want the date to be 2022-01-02 and after,
      // they don't mean midnight of the provided date.
      return !isSameDay(txDate, termDate) && isAfter(txDate, termDate);
    case ComparisonOperator.GreaterThanOrEqual:
      return isSameDay(txDate, termDate) || isAfter(txDate, termDate);
  }
}

function includes(
  fieldValue: string,
  originalTerm: string,
  c: CaseMatch
): boolean {
  if (c == CaseMatch.Exact) {
    return fieldValue.includes(originalTerm);
  }
  const term = originalTerm.toLowerCase();
  return fieldValue.toLowerCase().includes(term);
}

function includesIgnoreCase(fieldName: string, options: string[]): boolean {
  return options.map(o => o.toLowerCase()).includes(fieldName.toLowerCase());
}

function equals(id: number, term: string): boolean {
  return id.toString() == term;
}
