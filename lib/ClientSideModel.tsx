import { Bank, BankAccount, bankAccountModelFromDB } from "./model/BankAccount";
import { Category, categoryModelFromDB } from "./model/Category";
import { Currency, currencyModelFromDB } from "./model/Currency";
import { incomeModelFromDB } from "./model/Income";
import { personalExpenseModelFromDB } from "./model/PersonalExpense";
import { thirdPartyExpenseModelFromDB } from "./model/ThirdPartyExpense";
import { Transaction, transactionModelFromDB } from "./model/Transaction";
import { transferModelFromDB } from "./model/Transfer";
import { AllDatabaseData } from "./ServerSideDB";

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
  const currencies = currencyModelFromDB(dbData.dbCurrencies);
  const { banks, bankAccounts } = bankAccountModelFromDB(
    dbData.dbBanks,
    dbData.dbBankAccounts,
    currencies
  );

  const personalExpenses = personalExpenseModelFromDB(
    dbData.dbPersonalExpense,
    bankAccounts
  );
  const thirdPartyExpenses = thirdPartyExpenseModelFromDB(
    dbData.dbThirdPartyExpense,
    currencies
  );
  const transfers = transferModelFromDB(dbData.dbTransfer, bankAccounts);
  const incomes = incomeModelFromDB(dbData.dbIncome, bankAccounts);

  const transactions = transactionModelFromDB(
    dbData.dbTransactions,
    personalExpenses,
    thirdPartyExpenses,
    transfers,
    incomes,
    categories
  );

  return {
    banks,
    bankAccounts,
    currencies,
    categories,
    transactions,
  };
};
