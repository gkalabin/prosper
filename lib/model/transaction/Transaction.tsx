import { TransactionType } from "@prisma/client";
import { TransactionWithTagIds } from "lib/model/AllDatabaseDataModel";
import { BankAccount, accountUnit } from "lib/model/BankAccount";
import { Category } from "lib/model/Category";
import { Currency } from "lib/model/Currency";
import { Stock } from "lib/model/Stock";
import { Tag } from "lib/model/Tag";
import { Trip } from "lib/model/Trip";
import { Unit } from "lib/model/Unit";
import { Income, incomeModelFromDB } from "lib/model/transaction/Income";
import {
  PersonalExpense,
  personalExpenseModelFromDB,
} from "lib/model/transaction/PersonalExpense";
import {
  ThirdPartyExpense,
  thirdPartyExpenseModelFromDB,
} from "lib/model/transaction/ThirdPartyExpense";
import { Transfer, transferModelFromDB } from "lib/model/transaction/Transfer";
import { notEmpty } from "lib/util/util";

export type Transaction =
  | PersonalExpense
  | ThirdPartyExpense
  | Transfer
  | Income;

export type Expense = PersonalExpense | ThirdPartyExpense;

export type TransactionWithTrip = (Expense | Income) & {
  tripId: Required<number>;
};

export function transactionModelFromDB(
  init: TransactionWithTagIds,
): Transaction {
  if (init.transactionType == TransactionType.PERSONAL_EXPENSE) {
    return personalExpenseModelFromDB(init);
  }
  if (init.transactionType == TransactionType.THIRD_PARTY_EXPENSE) {
    return thirdPartyExpenseModelFromDB(init);
  }
  if (init.transactionType == TransactionType.TRANSFER) {
    return transferModelFromDB(init);
  }
  if (init.transactionType == TransactionType.INCOME) {
    return incomeModelFromDB(init);
  }
  throw new Error(`Unknown transaction type: ${JSON.stringify(init)}`);
}

export function transactionBankAccount(
  t: PersonalExpense | Income,
  bankAccounts: BankAccount[],
): BankAccount {
  const account = bankAccounts.find((a) => a.id == t.accountId);
  if (!account) {
    throw new Error(
      `Cannot find account ${t.accountId} for transaction ${t.id}`,
    );
  }
  return account;
}

export function transactionUnit(
  t: PersonalExpense | ThirdPartyExpense | Income,
  bankAccounts: BankAccount[],
  stocks: Stock[],
): Unit {
  switch (t.kind) {
    case "PersonalExpense":
    case "Income":
      const account = transactionBankAccount(t, bankAccounts);
      return accountUnit(account, stocks);
    case "ThirdPartyExpense":
      return Currency.mustFindByCode(t.currencyCode);
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`No unit for ${_exhaustiveCheck}`);
  }
}

export function transactionTags(t: Transaction, allTags: Tag[]): Tag[] {
  const findTag = (tagId: number) => {
    const found = allTags.find((tag) => tag.id == tagId);
    if (!found) {
      console.error(`Cannot find tag ${tagId} for transaction ${t.id}`);
    }
    return found;
  };
  return t.tagsIds.map(findTag).filter(notEmpty);
}

export function transactionTrip(
  t: PersonalExpense | ThirdPartyExpense | Income,
  allTrips: Trip[],
): Trip | null {
  return allTrips.find((trip) => trip.id == t.tripId);
}

// @deprecated
export function parentTransactionId(t: Income): number | null {
  return t.refundGroupTransactionIds.filter((id) => id != t.id)[0] ?? null;
}

export function isPersonalExpense(t: Transaction): t is PersonalExpense {
  return t.kind === "PersonalExpense";
}

export function isThirdPartyExpense(t: Transaction): t is ThirdPartyExpense {
  return t.kind === "ThirdPartyExpense";
}

export function isExpense(
  t: Transaction,
): t is PersonalExpense | ThirdPartyExpense {
  return isPersonalExpense(t) || isThirdPartyExpense(t);
}

export function isTransfer(t: Transaction): t is Transfer {
  return t.kind === "Transfer";
}

export function isIncome(t: Transaction): t is Income {
  return t.kind === "Income";
}

export function formatAmount(
  t: PersonalExpense,
  bankAccounts: BankAccount[],
): string {
  const account = bankAccounts.find((a) => a.id == t.accountId);
  const currency = Currency.findByCode(account.currencyCode);
  return currency.format(t.amountCents / 100);
}

export function otherPartyNameOrNull(t: Transaction): string | null {
  if (t.kind == "Transfer") {
    return null;
  }
  if (!t.companions.length) {
    return null;
  }
  return t.companions[0].name;
}

export function transactionCategory(
  t: Transaction,
  allCategories: Category[],
): Category {
  const c = allCategories.find((c) => c.id() == t.categoryId);
  if (!c) {
    throw new Error(
      `Cannot find category ${t.categoryId} for transaction ${t.id}`,
    );
  }
  return c;
}
