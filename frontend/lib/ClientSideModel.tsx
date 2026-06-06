import {Amount} from '@/lib/Amount';
import {AmountWithCurrency} from '@/lib/AmountWithCurrency';
import {CoreData} from '@/lib/db/fetch';
import {
  GetTransactionsResponse,
  Bank as PbBank,
  BankAccount as PbBankAccount,
  Stock as PbStock,
  Transaction as PbTransaction,
  TransactionPrototype,
} from '@/lib/grpc/gen/prosper/v1/ledger';
import {
  GetMarketDataForUserResponse,
  ExchangeRate as PbExchangeRate,
  StockQuote as PbStockQuote,
} from '@/lib/grpc/gen/prosper/v1/rates';
import {timestampToEpoch} from '@/lib/grpc/timestamp';
import {AppData} from '@/lib/model/AppDataModel';
import {
  Bank,
  BankAccount,
  bankAccountModelFromDB,
  bankModelFromDB,
} from '@/lib/model/BankAccount';
import {
  Category,
  categoryModelFromDB,
  sortCategories,
} from '@/lib/model/Category';
import {Currency, NANOS_MULTIPLIER, mustFindByCode} from '@/lib/model/Currency';
import {Stock, stockKey, stockModelFromDB} from '@/lib/model/Stock';
import {Tag, tagModelFromDB} from '@/lib/model/Tag';
import {
  Transaction,
  transactionModelFromDB as singleTransactionModelFromDB,
} from '@/lib/model/transaction/Transaction';
import {
  TransactionLink,
  transactionLinkModelFromDB,
} from '@/lib/model/TransactionLink';
import {Trip, tripModelFromDB} from '@/lib/model/Trip';
import {utcStartOfDay} from '@/lib/util/time';
import {closestTo} from 'date-fns';

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
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const days = [...timeseries.keys()];
  // Always extend to today so a closed-market weekend still resolves.
  days.push(utcStartOfDay(Date.now()));
  days.sort((a, b) => a - b);
  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1];
    const current = days[i];
    const prevValue = timeseries.get(prev);
    if (!prevValue) {
      throw new Error(
        `Prev value cannot be empty, failed to backfill ${timeseries} on ${prev}`
      );
    }
    for (let x = prev + MS_PER_DAY; x < current; x += MS_PER_DAY) {
      timeseries.set(x, prevValue);
    }
  }
};

export class ExchangeRates {
  private readonly ratesByCurrencyCode: Map<string, Map<string, Timeseries>>;

  public constructor(init: PbExchangeRate[]) {
    this.ratesByCurrencyCode = new Map();
    for (const r of init) {
      const {currencyCodeFrom: from, currencyCodeTo: to} = r;
      const timeseries =
        this.ratesByCurrencyCode.get(from)?.get(to) ?? new Map();
      const day = utcStartOfDay(timestampToEpoch(r.rateTimestamp));
      timeseries.set(day, Number(r.rateNanos));
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
    const rate = ratesHistory.get(utcStartOfDay(when));
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

// Stock quotes arrive over the wire in nanos (1 unit = 10^9 nanos).
// The rest of the FE works in cents, so divide by 1e7 once at the
// boundary and store cents in the timeseries.
const NANOS_PER_CENT = 10_000_000n;

export class StockQuotes {
  private readonly quotesByStock: Map<string, Timeseries>;

  public constructor(init: PbStockQuote[]) {
    this.quotesByStock = new Map();
    for (const r of init) {
      const cents = Number(BigInt(r.pricePerShareNanos) / NANOS_PER_CENT);
      const day = utcStartOfDay(timestampToEpoch(r.quoteTimestamp));
      const key = stockKey({exchange: r.stockExchange, ticker: r.stockTicker});
      const timeseries = this.quotesByStock.get(key) ?? new Map();
      timeseries.set(day, cents);
      this.quotesByStock.set(key, timeseries);
    }
    for (const quotes of this.quotesByStock.values()) {
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
    const quotesForStock = this.quotesByStock.get(stockKey(stock));
    if (!quotesForStock) {
      return undefined;
    }
    const quote = quotesForStock.get(utcStartOfDay(when));
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
  bankAccounts: BankAccount[];
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
  bankAccounts: BankAccount[];
  stocks: Stock[];
  trips: Trip[];
  tags: Tag[];
  exchange: StockAndCurrencyExchange;
  transactionPrototypes: TransactionDataModel['transactionPrototypes'];
  transactionLinks: TransactionLink[];
};

function mustBank(bank: Bank | undefined, message: string): Bank {
  if (!bank) {
    throw new Error(`Cannot find bank: ${message}`);
  }
  return bank;
}

export const banksModelFromDatabaseData = (
  dbBanks: PbBank[],
  dbBankAccounts: PbBankAccount[],
  dbStocks: PbStock[]
): [Bank[], BankAccount[], Stock[]] => {
  const stocks = dbStocks.map(stockModelFromDB);
  const banks = dbBanks
    .map(bankModelFromDB)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const bankAccounts = dbBankAccounts.map(bankAccountModelFromDB);
  // Sort bank accounts by display order, but taking precedence of the bank display order.
  const bankById = new Map<number, Bank>(banks.map(b => [b.id, b]));
  const bankByBankAccountId = new Map<number, Bank>(
    bankAccounts.map(a => {
      const bank = mustBank(
        bankById.get(a.bankId),
        `Bank ${a.bankId} for account ${a.id}`
      );
      return [a.id, bank];
    })
  );
  bankAccounts.sort((a, b) => {
    const bankA = mustBank(bankByBankAccountId.get(a.id), `Bank ${a.id}`);
    const bankB = mustBank(bankByBankAccountId.get(b.id), `Bank ${b.id}`);
    if (bankA.displayOrder != bankB.displayOrder) {
      return bankA.displayOrder - bankB.displayOrder;
    }
    return a.displayOrder - b.displayOrder;
  });
  return [banks, bankAccounts, stocks];
};

export function coreModelFromDB(dbData: CoreData): CoreDataModel {
  const categories = sortCategories(dbData.categories.map(categoryModelFromDB));
  const [banks, bankAccounts, stocks] = banksModelFromDatabaseData(
    dbData.banks,
    dbData.bankAccounts,
    dbData.stocks
  );
  const trips = dbData.trips.map(tripModelFromDB);
  const tags = dbData.tags.map(tagModelFromDB);
  return {
    banks,
    bankAccounts,
    stocks,
    categories,
    trips,
    tags,
  };
}

export function transactionModelFromDB(
  dbData: GetTransactionsResponse
): TransactionDataModel {
  const active = latestVersionOnly(dbData.transactions);
  const transactions: Transaction[] = active
    .map(tx => singleTransactionModelFromDB(tx, dbData.ledgerAccounts))
    .sort(compareTransactions);
  const transactionLinks = transactionLinkModelFromDB(
    dbData.links,
    transactions,
    dbData.transactions
  );
  return {
    transactions,
    transactionPrototypes: dbData.prototypes,
    transactionLinks,
  };
}

export function marketModelFromDB(
  dbData: GetMarketDataForUserResponse
): MarketDataModel {
  const exchangeRates = new ExchangeRates(dbData.rates);
  const stockQuotes = new StockQuotes(dbData.quotes);
  const exchange = new StockAndCurrencyExchange(exchangeRates, stockQuotes);
  return {exchange};
}

export const modelFromDatabaseData = (dbData: AppData): AllClientDataModel => {
  const categories = sortCategories(dbData.categories.map(categoryModelFromDB));
  const exchangeRates = new ExchangeRates(dbData.rates);
  const stockQuotes = new StockQuotes(dbData.quotes);
  const exchange = new StockAndCurrencyExchange(exchangeRates, stockQuotes);

  const [banks, bankAccounts, stocks] = banksModelFromDatabaseData(
    dbData.banks,
    dbData.bankAccounts,
    dbData.stocks
  );

  const trips = dbData.trips.map(tripModelFromDB);
  const tags = dbData.tags.map(tagModelFromDB);

  const active = latestVersionOnly(dbData.transactions);
  const transactions: Transaction[] = active
    .map(tx => singleTransactionModelFromDB(tx, dbData.ledgerAccounts))
    .sort(compareTransactions);

  const transactionLinks = transactionLinkModelFromDB(
    dbData.links,
    transactions,
    dbData.transactions
  );
  return {
    banks,
    bankAccounts,
    stocks,
    categories,
    trips,
    tags,
    transactions,
    exchange,
    transactionPrototypes: dbData.prototypes,
    transactionLinks,
  };
};

function compareTransactions(a: Transaction, b: Transaction) {
  if (b.timestampEpoch != a.timestampEpoch) {
    return b.timestampEpoch - a.timestampEpoch;
  }
  if (b.id != a.id) {
    return b.id - a.id;
  }
  return 0;
}

export function latestVersionOnly(
  transactions: PbTransaction[]
): PbTransaction[] {
  const superseded = new Set<number>();
  for (const tx of transactions) {
    if (!tx.supersedesId) {
      continue;
    }
    superseded.add(tx.supersedesId);
  }
  // TODO: do not filter out isVoid transactions here, they disappear from the user's point of view.
  // Instead they should result in a model transaction with isVoid flag and be shown in the list of transactions,
  // but ignored in all the calculations.
  const active = transactions.filter(
    tx => !superseded.has(tx.id) && !tx.isVoid
  );
  const iidCounts = new Map<number, number>();
  for (const tx of active) {
    iidCounts.set(tx.iid, (iidCounts.get(tx.iid) ?? 0) + 1);
  }
  for (const [iid, count] of iidCounts) {
    if (count == 1) {
      continue;
    }
    throw new Error(`Transaction ${iid} (iid) has ${count} active versions`);
  }
  return active;
}
