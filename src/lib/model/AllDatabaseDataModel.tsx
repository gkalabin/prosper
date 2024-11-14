import {useAllDatabaseDataContext} from '@/lib/context/AllDatabaseDataContext';
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
  const {bankAccounts} = useAllDatabaseDataContext();
  return bankAccounts.filter(x => !x.archived);
};
