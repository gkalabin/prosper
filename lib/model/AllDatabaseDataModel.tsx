import {
  Bank,
  BankAccount,
  Category,
  Currency,
  DisplaySettings,
  ExchangeRate,
  Income,
  PersonalExpense,
  StockQuote,
  Tag,
  ThirdPartyExpense,
  Transaction,
  TransactionPrototype,
  Transfer,
  Trip,
  Stock,
} from "@prisma/client";

export interface TransactionWithExtensions extends Transaction {
  personalExpense?: PersonalExpense;
  thirdPartyExpense?: ThirdPartyExpense;
  transfer?: Transfer;
  income?: Income;
}

export interface TransactionWithExtensionsAndTagIds
  extends TransactionWithExtensions {
  tags: {
    id: number;
  }[];
}

export type AllDatabaseData = {
  dbTransactions: TransactionWithExtensionsAndTagIds[];
  dbTransactionPrototypes: TransactionPrototype[];
  dbCategories: Category[];
  dbBanks: Bank[];
  dbBankAccounts: BankAccount[];
  dbTrips: Trip[];
  dbTags: Tag[];
  dbCurrencies: Currency[];
  dbExchangeRates: ExchangeRate[];
  dbStockQuotes: StockQuote[];
  dbDisplaySettings: DisplaySettings;
  dbStocks: Stock[];
};
