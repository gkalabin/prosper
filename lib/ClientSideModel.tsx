import {
  Bank as DBBank,
  Stock as DBStock,
  BankAccount as DBBankAccount,
  ExchangeRate as DBExchangeRate,
  StockQuote as DBStockQuote,
  TransactionPrototype,
} from "@prisma/client";
import { addDays, closestTo, isBefore, startOfDay } from "date-fns";
import { AmountWithCurrency } from "lib/AmountWithCurrency";
import { DisplaySettings } from "lib/displaySettings";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Category, categoryModelFromDB } from "lib/model/Category";
import { Currency, NANOS_MULTIPLIER } from "lib/model/Currency";
import { Stock } from "lib/model/Stock";
import { Tag } from "lib/model/Tag";
import { Transaction } from "lib/model/Transaction";
import { Trip } from "lib/model/Trip";
import { createContext, useContext, useState } from "react";
import { Amount } from "./Amount";

export class StockAndCurrencyExchange {
  private readonly exchangeRates?: ExchangeRates;
  private readonly stockQuotes?: StockQuotes;

  public constructor(er: ExchangeRates, sq: StockQuotes) {
    this.exchangeRates = er;
    this.stockQuotes = sq;
  }

  exchangeCurrency(
    a: AmountWithCurrency,
    target: Currency,
    when: Date
  ): AmountWithCurrency {
    return this.exchangeRates.exchange(a, target, when);
  }

  exchangeStock(
    a: Amount,
    stock: Stock,
    target: Currency,
    when: Date
  ): AmountWithCurrency {
    const exchangeCurrencyAmount = this.stockQuotes.exchange(a, stock, when);
    return this.exchangeRates.exchange(exchangeCurrencyAmount, target, when);
  }
}

const backfillMissingDates = (ratesByDate: { [epoch: number]: number }) => {
  const dates = [];
  for (const ts of Object.keys(ratesByDate)) {
    dates.push(+ts);
  }
  dates.push(new Date());
  dates.sort();
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1];
    const current = dates[i];
    for (let x = addDays(prev, 1); isBefore(x, current); x = addDays(x, 1)) {
      ratesByDate[x.getTime()] = ratesByDate[prev];
    }
  }
};

export class ExchangeRates {
  private readonly rates: {
    [currencyCodeFrom: number]: {
      [currencyCodeTo: number]: {
        [epoch: number]: number;
      };
    };
  };

  public constructor(init: DBExchangeRate[]) {
    this.rates = {};
    for (const r of init) {
      const { currencyCodeFrom: from, currencyCodeTo: to } = r;
      this.rates[from] ??= {};
      this.rates[from][to] ??= {};
      const date = startOfDay(new Date(r.rateTimestamp));
      this.rates[from][to][date.getTime()] = +r.rateNanos.toString();
    }
    for (const from of Object.keys(this.rates)) {
      for (const to of Object.keys(this.rates[from])) {
        backfillMissingDates(this.rates[from][to]);
      }
    }
  }

  exchange(
    a: AmountWithCurrency,
    target: Currency,
    when: Date
  ): AmountWithCurrency {
    if (a.getCurrency().code() == target.code()) {
      return a;
    }
    if (a.isZero()) {
      return AmountWithCurrency.zero(target);
    }
    const rateNanos = this.findRate(a.getCurrency(), target, when);
    return new AmountWithCurrency({
      amountCents: Math.round((a.cents() * rateNanos) / NANOS_MULTIPLIER),
      currency: target,
    });
  }

  private findRate(from: Currency, to: Currency, when: Date) {
    const whenDay = startOfDay(when);
    const ratesHistory = this.rates[from.code()][to.code()];
    const rate = ratesHistory[whenDay.getTime()];
    if (rate) {
      return rate;
    }
    const allTimestamps = Object.keys(ratesHistory).map((x) => +x);
    const closestTimestamp = closestTo(when, allTimestamps);
    console.warn(
      `Approximating ${from.code()}→${to.code()} rate for ${when} with ${closestTimestamp}`
    );
    return ratesHistory[closestTimestamp.getTime()];
  }
}

export class StockQuotes {
  private readonly quotes: {
    [stockId: number]: {
      [epoch: number]: number;
    };
  };

  public constructor(init: DBStockQuote[]) {
    this.quotes = {};
    for (const r of init) {
      const { stockId, value } = r;
      const date = startOfDay(new Date(r.quoteTimestamp));
      this.quotes[stockId] ??= {};
      this.quotes[stockId][date.getTime()] = value;
    }
    for (const stockName of Object.keys(this.quotes)) {
      backfillMissingDates(this.quotes[stockName]);
    }
  }

  exchange(a: Amount, stock: Stock, when: Date): AmountWithCurrency {
    if (a.isZero()) {
      return AmountWithCurrency.zero(stock.currency());
    }
    const pricePerShareCents = this.findQuote(stock, when);
    return new AmountWithCurrency({
      amountCents: Math.round(a.dollar() * pricePerShareCents),
      currency: stock.currency(),
    });
  }

  private findQuote(stock: Stock, when: Date): number {
    const whenDay = startOfDay(when);
    const quotesForStock = this.quotes[stock.id()];
    const quote = quotesForStock[whenDay.getTime()];
    if (quote) {
      return quote;
    }
    const allTimestamps = Object.keys(quotesForStock).map((x) => +x);
    const closestTimestamp = closestTo(when, allTimestamps);
    console.warn(
      `Approximating ${stock.ticker} quote for ${when} with ${closestTimestamp}`
    );
    return quotesForStock[closestTimestamp.getTime()];
  }
}

export type AllClientDataModel = {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  trips: Trip[];
  tags: Tag[];
  exchange: StockAndCurrencyExchange;
  displaySettings: DisplaySettings;
  transactionPrototypes: TransactionPrototype[];
};

const AllDatabaseDataContext = createContext<
  AllClientDataModel & {
    setDbData: (x: AllDatabaseData) => void;
  }
>(null);
export const AllDatabaseDataContextProvider = (props: {
  dbData: AllDatabaseData;
  children: JSX.Element | JSX.Element[];
}) => {
  const [dbDataState, setDbData] = useState(props.dbData);
  const model = modelFromDatabaseData(dbDataState);
  return (
    <AllDatabaseDataContext.Provider value={{ ...model, setDbData }}>
      {props.children}
    </AllDatabaseDataContext.Provider>
  );
};
export const useAllDatabaseDataContext = () => {
  return useContext(AllDatabaseDataContext);
};
export const useDisplayBankAccounts = () => {
  const { banks } = useAllDatabaseDataContext();
  return banks.flatMap((x) => x.accounts).filter((x) => !x.isArchived());
};

export const banksModelFromDatabaseData = (
  dbBanks: DBBank[],
  dbBankAccounts: DBBankAccount[],
  dbStocks: DBStock[]
): [Bank[], BankAccount[], Stock[]] => {
  const banks = dbBanks.map((b) => new Bank(b));
  const stocks = dbStocks.map((s) => new Stock(s));
  const bankById: {
    [id: number]: Bank;
  } = Object.fromEntries(banks.map((x) => [x.id, x]));
  const bankAccounts = dbBankAccounts.map(
    (x) => new BankAccount(x, bankById, stocks)
  );
  bankAccounts.forEach((x) => x.bank.accounts.push(x));
  banks.sort((a, b) => a.displayOrder - b.displayOrder);
  banks.forEach((b) =>
    b.accounts.sort((a, b) => a.displayOrder - b.displayOrder)
  );
  return [banks, bankAccounts, stocks];
};

export const modelFromDatabaseData = (
  dbData: AllDatabaseData
): AllClientDataModel => {
  const categories = categoryModelFromDB(dbData.dbCategories);
  const categoryById: {
    [id: number]: Category;
  } = Object.fromEntries(categories.map((c) => [c.id(), c]));

  const exchangeRates = new ExchangeRates(dbData.dbExchangeRates);
  const stockQuotes = new StockQuotes(dbData.dbStockQuotes);
  const exchange = new StockAndCurrencyExchange(exchangeRates, stockQuotes);

  const [banks, bankAccounts] = banksModelFromDatabaseData(
    dbData.dbBanks,
    dbData.dbBankAccounts,
    dbData.dbStocks
  );
  const bankAccountById: {
    [id: number]: BankAccount;
  } = Object.fromEntries(bankAccounts.map((x) => [x.id, x]));

  const trips = dbData.dbTrips.map((x) => new Trip(x));
  const tripById = new Map<number, Trip>(trips.map((x) => [x.id(), x]));
  const tags = dbData.dbTags.map((x) => new Tag(x));
  const tagById = new Map<number, Tag>(tags.map((x) => [x.id(), x]));

  const transactions: Transaction[] = dbData.dbTransactions
    .map(
      (t) =>
        new Transaction(
          t,
          categoryById,
          bankAccountById,
          tripById,
          tagById,
          exchange
        )
    )
    .filter((x) => x.valid());

  transactions.sort(compareTransactions);
  bankAccounts.forEach((ba) => ba.transactions.sort(compareTransactions));

  const displaySettings = new DisplaySettings(dbData.dbDisplaySettings);

  return {
    banks,
    categories,
    trips,
    tags,
    transactions,
    exchange,
    displaySettings,
    transactionPrototypes: dbData.dbTransactionPrototypes,
  };
};

function compareTransactions(a: Transaction, b: Transaction) {
  if (b.timestamp.getTime() != a.timestamp.getTime()) {
    return b.timestamp.getTime() - a.timestamp.getTime();
  }
  if (b.id != a.id) {
    return b.id - a.id;
  }
  return 0;
}
