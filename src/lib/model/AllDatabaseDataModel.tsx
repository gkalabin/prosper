import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {
  Bank,
  BankAccount,
  Category,
  DisplaySettings,
  EntryLine,
  ExchangeRate,
  LedgerAccount,
  SplitContext,
  Stock,
  StockQuote,
  Tag,
  Transaction,
  TransactionLink,
  TransactionPrototype,
  Trip,
} from '@prisma/client';

export type DBTransaction = Transaction & {
  lines: EntryLine[];
  tags: Pick<Tag, 'id'>[];
  splits: SplitContext[];
};

export type AllDatabaseData = {
  dbTransactions: DBTransaction[];
  dbTransactionLinks: TransactionLink[];
  dbTransactionPrototypes: TransactionPrototype[];
  dbLedgerAccounts: LedgerAccount[];
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
