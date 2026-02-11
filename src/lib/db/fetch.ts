import {updateRatesFallback} from '@/lib/asset-rates/backfill';
import {DB} from '@/lib/db';
import {TransactionWithTagIds} from '@/lib/model/AllDatabaseDataModel';
import {
  Bank,
  BankAccount,
  Category,
  DisplaySettings,
  ExchangeRate,
  Stock,
  StockQuote,
  Tag,
  TransactionLink,
  TransactionPrototype,
  Trip,
} from '@prisma/client';

export type TransactionData = {
  dbTransactions: TransactionWithTagIds[];
  dbTransactionLinks: TransactionLink[];
  dbTransactionPrototypes: TransactionPrototype[];
};

export async function fetchTransactionData({
  userId,
}: {
  userId: number;
}): Promise<TransactionData> {
  const data = {} as TransactionData;
  const reqId = Math.random().toString(36).slice(2, 7);
  const timeLabel = (label: string) =>
    `[db] ${label} fetch for userId:${userId} [${reqId}]`;
  const db = new DB({userId});
  await Promise.all(
    [
      async () => {
        console.time(timeLabel('dbTransactions'));
        data.dbTransactions = await db.transactionFindAll();
        console.timeEnd(timeLabel('dbTransactions'));
      },
      async () => {
        console.time(timeLabel('dbTransactionLinks'));
        data.dbTransactionLinks = await db.transactionLinkFindAll();
        console.timeEnd(timeLabel('dbTransactionLinks'));
      },
      async () => {
        console.time(timeLabel('dbTransactionPrototypes'));
        data.dbTransactionPrototypes = await db.transactionPrototypeFindMany();
        console.timeEnd(timeLabel('dbTransactionPrototypes'));
      },
    ].map(f => f())
  );
  return data;
}

export type CoreData = {
  dbCategories: Category[];
  dbBanks: Bank[];
  dbBankAccounts: BankAccount[];
  dbTrips: Trip[];
  dbTags: Tag[];
  dbStocks: Stock[];
  dbDisplaySettings: DisplaySettings;
};

export async function fetchCoreData({
  userId,
}: {
  userId: number;
}): Promise<CoreData> {
  const data = {} as CoreData;
  const reqId = Math.random().toString(36).slice(2, 7);
  const timeLabel = (label: string) =>
    `[db] ${label} fetch for userId:${userId} [${reqId}]`;
  const db = new DB({userId});
  await Promise.all(
    [
      async () => {
        console.time(timeLabel('dbBanks'));
        data.dbBanks = await db.bankFindMany();
        console.timeEnd(timeLabel('dbBanks'));
      },
      async () => {
        console.time(timeLabel('dbTrips'));
        data.dbTrips = await db.tripFindMany();
        console.timeEnd(timeLabel('dbTrips'));
      },
      async () => {
        console.time(timeLabel('dbTags'));
        data.dbTags = await db.tagFindMany();
        console.timeEnd(timeLabel('dbTags'));
      },
      async () => {
        console.time(timeLabel('dbBankAccounts'));
        data.dbBankAccounts = await db.bankAccountFindMany();
        console.timeEnd(timeLabel('dbBankAccounts'));
      },
      async () => {
        console.time(timeLabel('dbCategories'));
        data.dbCategories = await db.categoryFindMany();
        console.timeEnd(timeLabel('dbCategories'));
      },
      async () => {
        console.time(timeLabel('dbStocks'));
        data.dbStocks = await db.stocksFindMany();
        console.timeEnd(timeLabel('dbStocks'));
      },
      async () => {
        console.time(timeLabel('dbDisplaySettings'));
        data.dbDisplaySettings = await db.getDbDisplaySettings();
        console.timeEnd(timeLabel('dbDisplaySettings'));
      },
    ].map(f => f())
  );
  return data;
}

export type MarketData = {
  dbExchangeRates: ExchangeRate[];
  dbStockQuotes: StockQuote[];
};

export async function fetchMarketData({
  userId,
}: {
  userId: number;
}): Promise<MarketData> {
  const data = {} as MarketData;
  const reqId = Math.random().toString(36).slice(2, 7);
  const timeLabel = (label: string) =>
    `[db] ${label} fetch for userId:${userId} [${reqId}]`;
  const db = new DB({userId});
  await Promise.all(
    [
      async () => {
        console.time(timeLabel('dbExchangeRates'));
        data.dbExchangeRates = await db.exchangeRateFindMany();
        console.timeEnd(timeLabel('dbExchangeRates'));
      },
      async () => {
        console.time(timeLabel('dbStockQuotes'));
        data.dbStockQuotes = await db.stockQuoteFindMany();
        console.timeEnd(timeLabel('dbStockQuotes'));
      },
    ].map(f => f())
  );
  console.time(timeLabel('updateRatesFallback'));
  await updateRatesFallback(data);
  console.timeEnd(timeLabel('updateRatesFallback'));
  return data;
}
