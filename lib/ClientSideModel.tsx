import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
} from "@prisma/client";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Category, categoryModelFromDB } from "lib/model/Category";
import { Currency, currencyModelFromDB } from "lib/model/Currency";
import { Transaction } from "lib/model/Transaction";
import { AllDatabaseData } from "lib/ServerSideDB";

export type AllDataModel = {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  bankAccounts: BankAccount[];
  currencies: Currency[];
};

export const currencyModelFromDatabaseData = currencyModelFromDB;

export const banksModelFromDatabaseData = (
  dbBanks: DBBank[],
  dbBankAccounts: DBBankAccount[],
  dbCurrencies: DBCurrency[]
): [Bank[], BankAccount[]] => {
  const currencies = currencyModelFromDB(dbCurrencies);
  const currencyById: {
    [id: number]: Currency;
  } = Object.fromEntries(currencies.map((x) => [x.id, x]));

  const banks = dbBanks.map((b) =>
    Object.assign({}, b, {
      accounts: [],
    })
  );
  const bankById: {
    [id: number]: Bank;
  } = Object.fromEntries(banks.map((x) => [x.id, x]));
  const bankAccounts = dbBankAccounts.map((x) =>
    Object.assign({}, x, {
      bank: bankById[x.bankId],
      currency: currencyById[x.currencyId],
      transactions: [],
    })
  );
  bankAccounts.forEach((x) => x.bank.accounts.push(x));

  banks.sort((a, b) => a.displayOrder - b.displayOrder);
  banks.forEach((b) =>
    b.accounts.sort((a, b) => a.displayOrder - b.displayOrder)
  );

  return [banks, bankAccounts];
};

export const modelFromDatabaseData = (
  dbData: AllDatabaseData
): AllDataModel => {
  const categories = categoryModelFromDB(dbData.dbCategories);
  const categoryById: {
    [id: number]: Category;
  } = Object.fromEntries(categories.map((c) => [c.id, c]));

  const currencies = currencyModelFromDB(dbData.dbCurrencies);
  const currencyById: {
    [id: number]: Currency;
  } = Object.fromEntries(currencies.map((x) => [x.id, x]));

  const [banks, bankAccounts] = banksModelFromDatabaseData(
    dbData.dbBanks,
    dbData.dbBankAccounts,
    dbData.dbCurrencies
  );
  const bankAccountById: {
    [id: number]: BankAccount;
  } = Object.fromEntries(bankAccounts.map((x) => [x.id, x]));

  const transactions: Transaction[] = dbData.dbTransactions
    .map((t) => new Transaction(t, categoryById, bankAccountById, currencyById))
    .filter((x) => x.valid());

  transactions.sort(compareTransactions);
  bankAccounts.forEach((ba) => ba.transactions.sort(compareTransactions));

  return {
    banks,
    bankAccounts,
    currencies,
    categories,
    transactions,
  };
};

function compareTransactions(a: Transaction, b: Transaction) {
  if (b.timestamp.getTime() != a.timestamp.getTime()) {
    return b.timestamp.getTime() - a.timestamp.getTime();
  }
  if (b.id != a.id) {
    return b.id - a.id;
  }
  return 0;
}
