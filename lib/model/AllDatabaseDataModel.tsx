import {
  Bank,
  BankAccount,
  Category,
  Currency,
  ExchangeRate,
  Income,
  PersonalExpense,
  StockQuote,
  Tag,
  ThirdPartyExpense,
  Transaction,
  Transfer,
  Trip,
} from "@prisma/client";

export interface TransactionWithExtensions extends Transaction {
  personalExpense?: PersonalExpense;
  thirdPartyExpense?: ThirdPartyExpense;
  transfer?: Transfer;
  income?: Income;
}

export type AllDatabaseData = {
  dbTransactions: TransactionWithExtensions[];
  dbCategories: Category[];
  dbBanks: Bank[];
  dbBankAccounts: BankAccount[];
  dbTrips: Trip[];
  dbTags: Tag[];
  dbCurrencies: Currency[];
  dbExchangeRates: ExchangeRate[];
  dbStockQuotes: StockQuote[];
};
