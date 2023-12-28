import {
  Bank,
  BankAccount,
  Category,
  Currency,
  ExchangeRate,
  Income,
  PersonalExpense,
  StockQuote,
  ThirdPartyExpense,
  Transaction,
  Transfer
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
  dbCurrencies: Currency[];
  dbExchangeRates: ExchangeRate[];
  dbStockQuotes: StockQuote[];
};

// TODO: move to a separate file
export type OpenBankingData = {
  obData: any;
};