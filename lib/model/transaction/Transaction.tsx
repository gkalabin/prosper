import { Amount } from "lib/Amount";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { AmountWithUnit } from "lib/AmountWithUnit";
import { StockAndCurrencyExchange } from "lib/ClientSideModel";
import { Stock } from "lib/model/Stock";
import { Tag } from "lib/model/Tag";
import { Trip } from "lib/model/Trip";
import { TransactionWithExtensionsAndTagIds } from "../AllDatabaseDataModel";
import { BankAccount, accountUnit } from "../BankAccount";
import { Category } from "../Category";
import { Currency } from "../Currency";
import { Unit, isCurrency, isStock } from "../Unit";

export type TransactionCompanion = {
  name: string;
  amountCents: number;
};

export type PersonalExpense = {
  kind: "PersonalExpense";
  id: number;
  timestampEpoch: number;
  vendor: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId?: number;
  refundGroupTransactionIds: number[];
};

export type ThirdPartyExpense = {
  kind: "ThirdPartyExpense";
  id: number;
  timestampEpoch: number;
  payer: string;
  vendor: string;
  amountCents: number;
  currencyCode: string;
  ownShareCents: number;
  companions: TransactionCompanion[];
  note: string;
  categoryId: number;
  tagsIds: number[];
  tripId?: number;
};

export type Transfer = {
  kind: "Transfer";
  id: number;
  timestampEpoch: number;
  fromAccountId: number;
  toAccountId: number;
  sentAmountCents: number;
  receivedAmountCents: number;
  note: string;
  categoryId: number;
  tagsIds: number[];
};

export type Income = {
  kind: "Income";
  id: number;
  timestampEpoch: number;
  payer: string;
  amountCents: number;
  companions: TransactionCompanion[];
  note: string;
  accountId: number;
  categoryId: number;
  tagsIds: number[];
  tripId?: number;
  refundGroupTransactionIds: number[];
};

export function transactionModelFromDB(
  init: TransactionWithExtensionsAndTagIds
): Transaction {
  if (init.personalExpense) {
    const companions = [];
    if (init.personalExpense.ownShareAmountCents != init.amountCents) {
      companions.push({
        name: init.personalExpense.otherPartyName,
        amountCents:
          init.amountCents - init.personalExpense.ownShareAmountCents,
      });
    }
    // TODO: fill for expenses.
    const refundGroupTransactionIds: number[] = [];
    return {
      kind: "PersonalExpense",
      id: init.id,
      timestampEpoch: new Date(init.timestamp).getTime(),
      vendor: init.personalExpense.vendor,
      amountCents: init.amountCents,
      companions,
      note: init.description,
      accountId: init.personalExpense.accountId,
      categoryId: init.categoryId,
      tagsIds: init.tags.map((t) => t.id),
      tripId: init.personalExpense.tripId,
      refundGroupTransactionIds: refundGroupTransactionIds,
    };
  }
  if (init.thirdPartyExpense) {
    const companions = [
      {
        name: init.thirdPartyExpense.payer,
        amountCents:
          init.amountCents - init.thirdPartyExpense.ownShareAmountCents,
      },
    ];
    return {
      kind: "ThirdPartyExpense",
      id: init.id,
      timestampEpoch: new Date(init.timestamp).getTime(),
      payer: init.thirdPartyExpense.payer,
      vendor: init.thirdPartyExpense.vendor,
      amountCents: init.amountCents,
      currencyCode: init.thirdPartyExpense.currencyCode,
      ownShareCents: init.thirdPartyExpense.ownShareAmountCents,
      companions,
      note: init.description,
      categoryId: init.categoryId,
      tagsIds: init.tags.map((t) => t.id),
      tripId: init.thirdPartyExpense.tripId,
    };
  }
  if (init.transfer) {
    return {
      kind: "Transfer",
      id: init.id,
      timestampEpoch: new Date(init.timestamp).getTime(),
      fromAccountId: init.transfer.accountFromId,
      toAccountId: init.transfer.accountToId,
      sentAmountCents: init.amountCents,
      receivedAmountCents: init.transfer.receivedAmountCents,
      note: init.description,
      categoryId: init.categoryId,
      tagsIds: init.tags.map((t) => t.id),
    };
  }
  if (init.income) {
    const companions = [];
    if (init.income.ownShareAmountCents != init.amountCents) {
      companions.push({
        name: init.income.otherPartyName,
        amountCents: init.amountCents - init.income.ownShareAmountCents,
      });
    }
    const refundGroupTransactionIds: number[] = [];
    if (init.transactionToBeRepayedId) {
      refundGroupTransactionIds.push(init.transactionToBeRepayedId);
    }
    return {
      kind: "Income",
      id: init.id,
      timestampEpoch: new Date(init.timestamp).getTime(),
      payer: init.income.payer,
      amountCents: init.amountCents,
      companions,
      note: init.description,
      accountId: init.income.accountId,
      categoryId: init.categoryId,
      tagsIds: init.tags.map((t) => t.id),
      refundGroupTransactionIds,
    };
  }
  throw new Error(`Unknown transaction type: ${JSON.stringify(init)}`);
}

export type Transaction =
  | PersonalExpense
  | ThirdPartyExpense
  | Transfer
  | Income;

export type Expense = PersonalExpense | ThirdPartyExpense;

export function ownShareAmountCentsIgnoreRefuds(
  t: PersonalExpense | ThirdPartyExpense | Income
): number {
  const otherPartiesAmountCents = t.companions
    .map((c) => c.amountCents)
    .reduce((a, b) => a + b, 0);
  return t.amountCents - otherPartiesAmountCents;
}

export function outgoingBankAccount(
  t: Transfer,
  bankAccounts: BankAccount[]
): BankAccount {
  const account = bankAccounts.find((a) => a.id == t.fromAccountId);
  if (!account) {
    throw new Error(
      `Cannot find account ${t.fromAccountId} for transaction ${t.id}`
    );
  }
  return account;
}

export function incomingBankAccount(
  t: Transfer,
  bankAccounts: BankAccount[]
): BankAccount {
  const account = bankAccounts.find((a) => a.id == t.toAccountId);
  if (!account) {
    throw new Error(
      `Cannot find account ${t.toAccountId} for transaction ${t.id}`
    );
  }
  return account;
}

export function transactionBankAccount(
  t: PersonalExpense | Income,
  bankAccounts: BankAccount[]
): BankAccount {
  const account = bankAccounts.find((a) => a.id == t.accountId);
  if (!account) {
    throw new Error(
      `Cannot find account ${t.accountId} for transaction ${t.id}`
    );
  }
  return account;
}

export function rawTransactionAmount(
  t: PersonalExpense | ThirdPartyExpense | Income,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): AmountWithUnit {
  return new AmountWithUnit({
    amountCents: t.amountCents,
    unit: transactionUnit(t, bankAccounts, stocks),
  });
}

export function ownShareAmountIgnoreRefunds(
  t: PersonalExpense | ThirdPartyExpense | Income,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): AmountWithUnit {
  return new AmountWithUnit({
    amountCents: ownShareAmountCentsIgnoreRefuds(t),
    unit: transactionUnit(t, bankAccounts, stocks),
  });
}

export function transactionUnit(
  t: PersonalExpense | ThirdPartyExpense | Income,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): Unit {
  switch (t.kind) {
    case "PersonalExpense":
    case "Income":
      const account = transactionBankAccount(t, bankAccounts);
      return accountUnit(account, stocks);
    case "ThirdPartyExpense":
      return Currency.findByCode(t.currencyCode);
    default:
      const _exhaustiveCheck: never = t;
      throw new Error(`No unit for ${_exhaustiveCheck}`);
  }
}

export function amountSent(
  t: Transfer,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): AmountWithUnit {
  const outgoingAccount = outgoingBankAccount(t, bankAccounts);
  const unit = accountUnit(outgoingAccount, stocks);
  return new AmountWithUnit({
    amountCents: t.sentAmountCents,
    unit,
  });
}

export function amountReceived(
  t: Transfer,
  bankAccounts: BankAccount[],
  stocks: Stock[]
): AmountWithUnit {
  const incomingAccount = incomingBankAccount(t, bankAccounts);
  const unit = accountUnit(incomingAccount, stocks);
  return new AmountWithUnit({
    amountCents: t.receivedAmountCents,
    unit,
  });
}

export function amountAllParties(
  t: PersonalExpense | ThirdPartyExpense | Income,
  target: Currency,
  bankAccounts: BankAccount[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange
): AmountWithCurrency {
  const unit = transactionUnit(t, bankAccounts, stocks);
  const allParties = new Amount({ amountCents: t.amountCents });
  if (isCurrency(unit)) {
    const amount = new AmountWithCurrency({
      amountCents: allParties.cents(),
      currency: unit,
    });
    return exchange.exchangeCurrency(amount, target, t.timestampEpoch);
  }
  if (isStock(unit)) {
    return exchange.exchangeStock(allParties, unit, target, t.timestampEpoch);
  }
  throw new Error(`Unknown unit: ${unit}`);
}

export function amountOwnShare(
  t: PersonalExpense | ThirdPartyExpense | Income,
  target: Currency,
  bankAccounts: BankAccount[],
  stocks: Stock[],
  exchange: StockAndCurrencyExchange
): AmountWithCurrency {
  const unit = transactionUnit(t, bankAccounts, stocks);
  const ownShare = new Amount({
    amountCents: ownShareAmountCentsIgnoreRefuds(t),
  });

  if (isCurrency(unit)) {
    const amount = new AmountWithCurrency({
      amountCents: ownShare.cents(),
      currency: unit,
    });
    return exchange.exchangeCurrency(amount, target, t.timestampEpoch);
  }
  if (isStock(unit)) {
    return exchange.exchangeStock(ownShare, unit, target, t.timestampEpoch);
  }
  throw new Error(`Unknown unit: ${unit}`);
}

export function transactionTags(t: Transaction, allTags: Tag[]): Tag[] {
  return t.tagsIds.map((tagId) => allTags.find((tag) => tag.id == tagId));
}

export function transactionTrip(
  t: PersonalExpense | ThirdPartyExpense | Income,
  allTrips: Trip[]
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
  t: Transaction
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
  bankAccounts: BankAccount[]
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
  allCategories: Category[]
): Category {
  const c = allCategories.find((c) => c.id() == t.categoryId);
  if (!c) {
    throw new Error(
      `Cannot find category ${t.categoryId} for transaction ${t.id}`
    );
  }
  return c;
}
