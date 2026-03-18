import {useCoreDataContext} from '@/lib/context/CoreDataContext';
import {
  Bank,
  BankAccount,
  Category,
  DisplaySettings,
  EntryLineV2,
  ExchangeRate,
  LedgerAccountV2,
  SplitContextV2,
  Stock,
  StockQuote,
  TagV2,
  TransactionLinkV2,
  TransactionPrototypeV2,
  TransactionV2,
  Trip,
} from '@prisma/client';

export type DBTransaction = TransactionV2 & {
  lines: EntryLineV2[];
  tags: Pick<TagV2, 'id'>[];
  splits: SplitContextV2[];
};

export type AllDatabaseData = {
  dbTransactions: DBTransaction[];
  dbTransactionLinks: TransactionLinkV2[];
  dbTransactionPrototypes: TransactionPrototypeV2[];
  dbLedgerAccounts: LedgerAccountV2[];
  dbCategories: Category[];
  dbBanks: Bank[];
  dbBankAccounts: BankAccount[];
  dbTrips: Trip[];
  dbTags: TagV2[];
  dbExchangeRates: ExchangeRate[];
  dbStockQuotes: StockQuote[];
  dbDisplaySettings: DisplaySettings;
  dbStocks: Stock[];
};

export const useDisplayBankAccounts = () => {
  const {bankAccounts} = useCoreDataContext();
  return bankAccounts.filter(x => !x.archived);
};
