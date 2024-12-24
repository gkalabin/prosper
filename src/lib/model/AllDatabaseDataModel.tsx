import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {
  Bank,
  BankAccount,
  Category,
  DisplaySettings,
  ExchangeRate,
  Stock,
  StockQuote,
  Tag,
  Transaction,
  TransactionLink,
  TransactionPrototype,
  Trip,
} from '@prisma/client';

export interface TransactionWithTagIds extends Transaction {
  tags: {
    id: number;
  }[];
}

export type AllDatabaseData = {
  dbTransactions: TransactionWithTagIds[];
  dbTransactionLinks: TransactionLink[];
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

export const useDisplayBankAccounts = () => {
  const {bankAccounts} = useCoreDataContext();
  return bankAccounts.filter(x => !x.archived);
};
