import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {
  AccountNEW,
  Bank,
  Category,
  DisplaySettings,
  ExchangeRate,
  Stock,
  StockQuote,
  Tag,
  Transaction,
  TransactionLineNEW,
  TransactionLinkNEW,
  TransactionNEW,
  TransactionPrototype,
  Trip,
} from '@prisma/client';

export interface TransactionWithTagIds extends Transaction {
  tags: {
    id: number;
  }[];
}

export interface TransactionNEWWithTagIds extends TransactionNEW {
  tags: {
    id: number;
  }[];
}

export type AllDatabaseData = {
  dbTransactions: TransactionNEWWithTagIds[];
  dbTransactionLines: TransactionLineNEW[];
  dbTransactionLinks: TransactionLinkNEW[];
  dbTransactionPrototypes: TransactionPrototype[];
  dbAccounts: AccountNEW[];
  dbCategories: Category[];
  dbBanks: Bank[];
  dbTrips: Trip[];
  dbTags: Tag[];
  dbExchangeRates: ExchangeRate[];
  dbStockQuotes: StockQuote[];
  dbDisplaySettings: DisplaySettings;
  dbStocks: Stock[];
};

export const useDisplayBankAccounts = () => {
  const {accounts} = useCoreDataContext();
  return accounts.filter(x => x.bankId).filter(x => !x.archived);
};
