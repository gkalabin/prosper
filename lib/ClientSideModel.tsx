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

  const banks = dbData.dbBanks.map((b) =>
    Object.assign({}, b, {
      accounts: [],
      dbValue: b,
    })
  );
  const bankById: {
    [id: number]: Bank;
  } = Object.fromEntries(banks.map((x) => [x.id, x]));
  const bankAccounts = dbData.dbBankAccounts.map((x) =>
    Object.assign({}, x, {
      bank: bankById[x.bankId],
      currency: currencyById[x.currencyId],
      dbValue: x,
      transactions: [],
    })
  );
  bankAccounts.forEach((x) => x.bank.accounts.push(x));
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
