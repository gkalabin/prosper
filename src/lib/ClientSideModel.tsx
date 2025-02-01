import {Amount} from '@/lib/Amount';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {
  CoreData as CoreDataDB,
  MarketData as MarketDataDB,
  TransactionData as TransactionDataDB,
} from '@/lib/db/fetch';
import {Account, accountModelFromDB} from '@/lib/model/Account';
import {AllDatabaseData} from '@/lib/model/AllDatabaseDataModel';
import {Bank, bankModelFromDB} from '@/lib/model/Bank';
import {
  Category,
  categoryModelFromDB,
  sortCategories,
} from '@/lib/model/Category';
import {Currency, NANOS_MULTIPLIER, mustFindByCode} from '@/lib/model/Currency';
import {Stock, stockModelFromDB} from '@/lib/model/Stock';
import {Tag, tagModelFromDB} from '@/lib/model/Tag';
import {
  TransactionLink,
  transactionLinkModelFromDB,
} from '@/lib/model/TransactionLink';
import {Transaction, fromDB} from '@/lib/model/transactionNEW/Transaction';
import {Trip, tripModelFromDB} from '@/lib/model/Trip';
import {
  AccountNEW as DBAccount,
  Bank as DBBank,
  ExchangeRate as DBExchangeRate,
  Stock as DBStock,
  StockQuote as DBStockQuote,
  TransactionPrototype,
} from '@prisma/client';
import {addDays, closestTo, isBefore, startOfDay} from 'date-fns';

export class StockAndCurrencyExchange {
  private readonly exchangeRates: ExchangeRates;
  private readonly stockQuotes: StockQuotes;

  public constructor(er: ExchangeRates, sq: StockQuotes) {
    this.exchangeRates = er;
    this.stockQuotes = sq;
  }

  exchangeCurrency(
    a: AmountWithCurrency,
    target: Currency,
    when: Date | number
  ): AmountWithCurrency | undefined {
    return this.exchangeRates.exchange(a, target, when);
  }

  exchangeStock(
    a: Amount,
    stock: Stock,
    target: Currency,
    when: Date | number
  ): AmountWithCurrency | undefined {
    const exchangeCurrencyAmount = this.stockQuotes.exchange(a, stock, when);
    if (!exchangeCurrencyAmount) {
      return undefined;
    }
    return this.exchangeRates.exchange(exchangeCurrencyAmount, target, when);
  }
}

const backfillMissingDates = (timeseries: Timeseries) => {
  const dates = [];
  for (const ts of timeseries.keys()) {
    dates.push(ts);
  }
  const today = new Date().getTime();
  // Always add today's date to avoid missing quotes during the weekend.
  // The exchange is closed during the weekend,
  // so the latest available quote might be from 2 days ago.
  dates.push(today);
  dates.sort();
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1];
    const current = dates[i];
    for (let x = addDays(prev, 1); isBefore(x, current); x = addDays(x, 1)) {
      const prevValue = timeseries.get(prev);
      if (!prevValue) {
        throw new Error(
          `Prev value cannot be null, failed to backfill ${timeseries} on ${today}`
        );
      }
      timeseries.set(x.getTime(), prevValue);
    }
  }
};

export class ExchangeRates {
  private readonly ratesByCurrencyCode: Map<string, Map<string, Timeseries>>;

  public constructor(init: DBExchangeRate[]) {
    this.ratesByCurrencyCode = new Map();
    for (const r of init) {
      const {currencyCodeFrom: from, currencyCodeTo: to} = r;
      const timeseries =
        this.ratesByCurrencyCode.get(from)?.get(to) ?? new Map();
      const date = startOfDay(new Date(r.rateTimestamp));
      timeseries.set(date.getTime(), +r.rateNanos.toString());
      let fromRates = this.ratesByCurrencyCode.get(from);
      if (!fromRates) {
        fromRates = new Map();
        this.ratesByCurrencyCode.set(from, fromRates);
      }
      fromRates.set(to, timeseries);
    }
    for (const from of this.ratesByCurrencyCode.values()) {
      for (const rates of from.values()) {
        backfillMissingDates(rates);
      }
    }
  }

  exchange(
    a: AmountWithCurrency,
    target: Currency,
    when: Date | number
  ): AmountWithCurrency | undefined {
    if (a.getCurrency().code == target.code) {
      return a;
    }
    if (a.isZero()) {
      return AmountWithCurrency.zero(target);
    }
    const rateNanos = this.findRate(a.getCurrency(), target, when);
    if (!rateNanos) {
      return undefined;
    }
    return new AmountWithCurrency({
      amountCents: Math.round((a.cents() * rateNanos) / NANOS_MULTIPLIER),
      currency: target,
    });
  }

  private findRate(
    from: Currency,
    to: Currency,
    when: Date | number
  ): number | undefined {
    const ratesFrom = this.ratesByCurrencyCode.get(from.code);
    if (!ratesFrom) {
      return undefined;
    }
    const ratesHistory = ratesFrom.get(to.code);
    if (!ratesHistory) {
      return undefined;
    }
    const whenDay = startOfDay(when);
    const rate = ratesHistory.get(whenDay.getTime());
    if (rate) {
      return rate;
    }
    const allTimestamps = [...ratesHistory.keys()];
    const closestTimestamp = closestTo(when, allTimestamps);
    if (!closestTimestamp) {
      return undefined;
    }
    console.warn(
      `Approximating ${from.code}→${to.code} rate for ${when} with ${closestTimestamp}`
    );
    return ratesHistory.get(closestTimestamp.getTime());
  }
}

type Timeseries = Map<number, number>;

export class StockQuotes {
  private readonly quotesByStockId: Map<number, Timeseries>;

  public constructor(init: DBStockQuote[]) {
    this.quotesByStockId = new Map();
    for (const r of init) {
      const {stockId, value} = r;
      const day = startOfDay(new Date(r.quoteTimestamp));
      const timeseries = this.quotesByStockId.get(stockId) ?? new Map();
      timeseries.set(day.getTime(), value);
      this.quotesByStockId.set(stockId, timeseries);
    }
    for (const quotes of this.quotesByStockId.values()) {
      backfillMissingDates(quotes);
    }
  }

  exchange(
    a: Amount,
    stock: Stock,
    when: Date | number
  ): AmountWithCurrency | undefined {
    const currency = mustFindByCode(stock.currencyCode);
    if (a.isZero()) {
      return AmountWithCurrency.zero(currency);
    }
    const pricePerShareCents = this.findQuote(stock, when);
    if (!pricePerShareCents) {
      return undefined;
    }
    return new AmountWithCurrency({
      amountCents: Math.round(a.dollar() * pricePerShareCents),
      currency,
    });
  }

  private findQuote(stock: Stock, when: Date | number): number | undefined {
    const whenDay = startOfDay(when);
    const quotesForStock = this.quotesByStockId.get(stock.id);
    if (!quotesForStock) {
      return undefined;
    }
    const quote = quotesForStock.get(whenDay.getTime());
    if (quote) {
      return quote;
    }
    const allTimestamps = [...quotesForStock.keys()];
    const closestTimestamp = closestTo(when, allTimestamps);
    if (!closestTimestamp) {
      return undefined;
    }
    console.warn(
      `Approximating ${stock.ticker} quote for ${when} with ${closestTimestamp}`
    );
    return quotesForStock.get(closestTimestamp.getTime());
  }
}

export type CoreDataModel = {
  categories: Category[];
  banks: Bank[];
  accounts: Account[];
  stocks: Stock[];
  trips: Trip[];
  tags: Tag[];
};

export type TransactionDataModel = {
  transactions: Transaction[];
  transactionPrototypes: TransactionPrototype[];
  transactionLinks: TransactionLink[];
};

export type MarketDataModel = {
  exchange: StockAndCurrencyExchange;
};

export type AllClientDataModel = {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  accounts: Account[];
  stocks: Stock[];
  trips: Trip[];
  tags: Tag[];
  exchange: StockAndCurrencyExchange;
  transactionPrototypes: TransactionPrototype[];
  transactionLinks: TransactionLink[];
};

function mustBank(bank: Bank | undefined, message: string): Bank {
  if (!bank) {
    throw new Error(`Cannot find bank: ${message}`);
  }
  return bank;
}

export const banksModelFromDatabaseData = (
  dbBanks: DBBank[],
  dbAccounts: DBAccount[],
  dbStocks: DBStock[]
): [Bank[], Account[], Stock[]] => {
  const stocks = dbStocks.map(stockModelFromDB);
  const banks = dbBanks
    .map(bankModelFromDB)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const accounts = dbAccounts.map(accountModelFromDB);
  // Sort bank accounts by display order, but taking precedence of the bank display order.
  const bankById = new Map<number, Bank>(banks.map(b => [b.id, b]));
  const bankByAccountId = new Map<number, Bank>();
  accounts.forEach(a => {
    if (a.bankId) {
      const bank = mustBank(bankById.get(a.bankId), `${a.id}`);
      bankByAccountId.set(a.id, bank);
    }
  });
  accounts.sort((a, b) => {
    const bankA = bankByAccountId.get(a.id);
    const bankB = bankByAccountId.get(b.id);
    const bankADisplayOrder = bankA?.displayOrder ?? -1;
    const bankBDisplayOrder = bankB?.displayOrder ?? -1;
    if (bankADisplayOrder != bankBDisplayOrder) {
      return bankADisplayOrder - bankBDisplayOrder;
    }
    return a.displayOrder - b.displayOrder;
  });
  return [banks, accounts, stocks];
};

export function coreModelFromDB(dbData: CoreDataDB): CoreDataModel {
  const categories = sortCategories(
    dbData.dbCategories.map(categoryModelFromDB)
  );
  const [banks, accounts, stocks] = banksModelFromDatabaseData(
    dbData.dbBanks,
    dbData.dbAccounts,
    dbData.dbStocks
  );
  const trips = dbData.dbTrips.map(tripModelFromDB);
  const tags = dbData.dbTags.map(tagModelFromDB);
  return {
    banks,
    accounts,
    stocks,
    categories,
    trips,
    tags,
  };
}

export function transactionModelFromDB(
  dbData: TransactionDataDB,
  coreData: CoreDataModel
): TransactionDataModel {
  const transactions: Transaction[] = dbData.dbTransactions
    .map(t =>
      fromDB({
        dbTransaction: t,
        dbLines: dbData.dbTransactionLines,
        accounts: coreData.accounts,
      })
    )
    .sort(compareTransactions);
  const transactionLinks = transactionLinkModelFromDB(
    dbData.dbTransactionLinks,
    transactions
  );
  return {
    transactions,
    transactionPrototypes: dbData.dbTransactionPrototypes,
    transactionLinks,
  };
}

export function marketModelFromDB(dbData: MarketDataDB): MarketDataModel {
  const exchangeRates = new ExchangeRates(dbData.dbExchangeRates);
  const stockQuotes = new StockQuotes(dbData.dbStockQuotes);
  const exchange = new StockAndCurrencyExchange(exchangeRates, stockQuotes);
  return {exchange};
}

export const modelFromDatabaseData = (
  dbData: AllDatabaseData
): AllClientDataModel => {
  const categories = sortCategories(
    dbData.dbCategories.map(categoryModelFromDB)
  );
  const exchangeRates = new ExchangeRates(dbData.dbExchangeRates);
  const stockQuotes = new StockQuotes(dbData.dbStockQuotes);
  const exchange = new StockAndCurrencyExchange(exchangeRates, stockQuotes);

  const [banks, accounts, stocks] = banksModelFromDatabaseData(
    dbData.dbBanks,
    dbData.dbAccounts,
    dbData.dbStocks
  );

  const trips = dbData.dbTrips.map(tripModelFromDB);
  const tags = dbData.dbTags.map(tagModelFromDB);

  const transactions: Transaction[] = dbData.dbTransactions
    .map(t =>
      fromDB({
        dbTransaction: t,
        dbLines: dbData.dbTransactionLines,
        accounts: accounts,
      })
    )
    .sort(compareTransactions);

  const transactionLinks = transactionLinkModelFromDB(
    dbData.dbTransactionLinks,
    transactions
  );
  return {
    banks,
    accounts,
    stocks,
    categories,
    trips,
    tags,
    transactions,
    exchange,
    transactionPrototypes: dbData.dbTransactionPrototypes,
    transactionLinks,
  };
};

function compareTransactions(a: Transaction, b: Transaction) {
  if (b.timestampEpoch != a.timestampEpoch) {
    return b.timestampEpoch - a.timestampEpoch;
  }
  if (b.transactionId != a.transactionId) {
    return b.transactionId - a.transactionId;
  }
  return 0;
}
