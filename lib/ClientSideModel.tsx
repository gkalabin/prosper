import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  ExchangeRate as DBExchangeRate,
  Stock as DBStock,
  StockQuote as DBStockQuote,
  TransactionPrototype,
} from '@prisma/client';
import {addDays, closestTo, isBefore, startOfDay} from 'date-fns';
import {Amount} from 'lib/Amount';
import {AmountWithCurrency} from 'lib/AmountWithCurrency';
import {AllDatabaseData} from 'lib/model/AllDatabaseDataModel';
import {
  Bank,
  BankAccount,
  bankAccountModelFromDB,
  bankModelFromDB,
} from 'lib/model/BankAccount';
import {
  Category,
  categoryModelFromDB,
  sortCategories,
} from 'lib/model/Category';
import {Currency, NANOS_MULTIPLIER} from 'lib/model/Currency';
import {Stock, stockModelFromDB} from 'lib/model/Stock';
import {Tag, tagModelFromDB} from 'lib/model/Tag';
import {Trip, tripModelFromDB} from 'lib/model/Trip';
import {
  Transaction,
  transactionModelFromDB,
} from 'lib/model/transaction/Transaction';

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
    if (a.getCurrency().code() == target.code()) {
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
    const ratesFrom = this.ratesByCurrencyCode.get(from.code());
    if (!ratesFrom) {
      return undefined;
    }
    const ratesHistory = ratesFrom.get(to.code());
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
      `Approximating ${from.code()}→${to.code()} rate for ${when} with ${closestTimestamp}`
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
    const currency = Currency.mustFindByCode(stock.currencyCode);
    if (a.isZero()) {
      return AmountWithCurrency.zero(currency);
    }
    const pricePerShareCents = this.findQuote(stock, when);
    if (!pricePerShareCents) {
      return undefined;
    }
    return new AmountWithCurrency({
      amountCents: Math.round(
        a.dollar() * pricePerShareCents * stock.multiplier
      ),
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

export type AllClientDataModel = {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  bankAccounts: BankAccount[];
  stocks: Stock[];
  trips: Trip[];
  tags: Tag[];
  exchange: StockAndCurrencyExchange;
  transactionPrototypes: TransactionPrototype[];
};

function mustBank(bank: Bank | undefined, message: string): Bank {
  if (!bank) {
    throw new Error(`Cannot find bank: ${message}`);
  }
  return bank;
}

export const banksModelFromDatabaseData = (
  dbBanks: DBBank[],
  dbBankAccounts: DBBankAccount[],
  dbStocks: DBStock[]
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

export const modelFromDatabaseData = (
  dbData: AllDatabaseData
): AllClientDataModel => {
  const categories = sortCategories(
    dbData.dbCategories.map(categoryModelFromDB)
  );
  const exchangeRates = new ExchangeRates(dbData.dbExchangeRates);
  const stockQuotes = new StockQuotes(dbData.dbStockQuotes);
  const exchange = new StockAndCurrencyExchange(exchangeRates, stockQuotes);

  const [banks, bankAccounts, stocks] = banksModelFromDatabaseData(
    dbData.dbBanks,
    dbData.dbBankAccounts,
    dbData.dbStocks
  );

  const trips = dbData.dbTrips.map(tripModelFromDB);
  const tags = dbData.dbTags.map(tagModelFromDB);

  const transactions: Transaction[] = dbData.dbTransactions
    .map(transactionModelFromDB)
    .sort(compareTransactions);
  return {
    banks,
    bankAccounts,
    stocks,
    categories,
    trips,
    tags,
    transactions,
    exchange,
    transactionPrototypes: dbData.dbTransactionPrototypes,
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
