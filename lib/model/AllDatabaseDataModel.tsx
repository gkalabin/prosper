import {
  Bank,
  BankAccount,
  Category,
  DisplaySettings,
  ExchangeRate,
  Income,
  PersonalExpense,
  Stock,
  StockQuote,
  Tag,
  ThirdPartyExpense,
  Transaction,
  TransactionPrototype,
  Transfer,
  Trip,
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
  dbExchangeRates: ExchangeRate[];
  dbStockQuotes: StockQuote[];
  dbDisplaySettings: DisplaySettings;
  dbStocks: Stock[];
};
