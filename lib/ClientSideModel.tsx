import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
  ExchangeRate as DBExchangeRate,
  StockQuote as DBStockQuote,
} from "@prisma/client";
import { addDays, closestTo, isBefore, startOfDay } from "date-fns";
import { AllDatabaseData } from "lib/model/AllDatabaseDataModel";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Category, categoryModelFromDB } from "lib/model/Category";
import { Transaction } from "lib/model/Transaction";
import { Trip } from "lib/model/Trip";
import { Tag } from "lib/model/Tag";
import { createContext, useContext } from "react";
import { Currencies, Currency, NANOS_MULTIPLIER } from "lib/model/Currency";

const CurrencyContext = createContext<Currencies>(null);
export const CurrencyContextProvider = (props: {
  init: DBCurrency[];
  children: JSX.Element | JSX.Element[];
}) => {
  return (
    <CurrencyContext.Provider value={new Currencies(props.init)}>
      {props.children}
    </CurrencyContext.Provider>
  );
};
export const useCurrencyContext = () => {
  return useContext(CurrencyContext);
};

export class AmountWithCurrency {
  private readonly amount: Amount;
  private readonly currency: Currency;

  private static formatters = {
    // TODO: generalise
    EUR: new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }),
    RUB: new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }),
    GBP: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }),
    USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  };

  public constructor(init: { amountCents: number; currency: Currency }) {
    this.amount = new Amount({ amountCents: init.amountCents });
    this.currency = init.currency;
  }

  public getCurrency() {
    return this.currency;
  }

  public getAmountWithoutCurrency() {
    return this.amount;
  }

  public cents() {
    return this.amount.cents();
  }

  public dollar() {
    return this.amount.dollar();
  }

  public add(other: AmountWithCurrency): AmountWithCurrency {
    this.assertSameCurrency(other);
    return new AmountWithCurrency({
      amountCents: this.amount.add(other.amount).cents(),
      currency: this.currency,
    });
  }

  public subtract(other: AmountWithCurrency): AmountWithCurrency {
    this.assertSameCurrency(other);
    return new AmountWithCurrency({
      amountCents: this.amount.subtract(other.amount).cents(),
      currency: this.currency,
    });
  }

  public equals(other: AmountWithCurrency) {
    this.assertSameCurrency(other);
    return this.amount.equals(other.amount);
  }

  public lessThan(other: AmountWithCurrency) {
    this.assertSameCurrency(other);
    return this.amount.lessThan(other.amount);
  }

  public format(): string {
    // TODO: move stocks into a separate type
    if (this.currency.isStock()) {
      return `${this.dollar()} ${this.currency.name}`;
    }
    const formatter = AmountWithCurrency.formatters[this.currency.name];
    if (!formatter) {
      throw new Error(`Unknown formatter for currency ${this.currency.name}`);
    }
    return formatter.format(this.dollar());
  }

  public toString() {
    return this.format();
  }

  private assertSameCurrency(a: AmountWithCurrency) {
    if (a.currency.id != this.currency.id) {
      throw new Error(
        `Impossible to add ${a.currency.name} and ${this.currency.name}`
      );
    }
  }
}

export class Amount {
  static readonly ZERO = new Amount({ amountCents: 0 });

  private readonly amountCents: number;

  public constructor(init: { amountCents: number }) {
    if (!Number.isInteger(init.amountCents)) {
      throw new Error(`Want integer, got ${init.amountCents}`);
    }
    this.amountCents = init.amountCents;
  }

  public cents() {
    return this.amountCents;
  }

  public dollar() {
    return this.amountCents / 100;
  }

  public abs(): Amount {
    if (this.amountCents >= 0) {
      return this;
    }
    return new Amount({
      amountCents: -this.amountCents,
    });
  }

  public add(a: Amount): Amount {
    return new Amount({
      amountCents: this.amountCents + a.amountCents,
    });
  }

  public subtract(a: Amount): Amount {
    return new Amount({
      amountCents: this.amountCents - a.amountCents,
    });
  }

  public equals(a: Amount) {
    return this.amountCents == a.amountCents;
  }

  public lessThan(a: Amount) {
    return this.amountCents < a.amountCents;
  }

  public format(): string {
    return this.dollar().toFixed(2);
  }
}

export class StockAndCurrencyExchange {
  private readonly exchangeRates?: ExchangeRates;
  private readonly stockQuotes?: StockQuotes;

  public constructor(er: ExchangeRates, sq: StockQuotes) {
    this.exchangeRates = er;
    this.stockQuotes = sq;
  }

  exchange(
    a: AmountWithCurrency,
    target: Currency,
    when: Date
  ): AmountWithCurrency {
    let from = a;
    if (a.getCurrency().isStock()) {
      from = this.stockQuotes.exchange(from, when);
    }
    return this.exchangeRates.exchange(from, target, when);
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
    [currencyIdFrom: number]: {
      [currencyIdTo: number]: {
        [epoch: number]: number;
      };
    };
  };

  public constructor(init: DBExchangeRate[]) {
    this.rates = {};
    for (const r of init) {
      const { currencyFromId: fromId, currencyToId: toId } = r;
      this.rates[fromId] ??= {};
      this.rates[fromId][toId] ??= {};
      const date = startOfDay(new Date(r.rateTimestamp));
      this.rates[fromId][toId][date.getTime()] = +r.rateNanos.toString();
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
    if (a.getCurrency().id == target.id) {
      return a;
    }
    if (a.getCurrency().isStock() || target.isStock()) {
      throw new Error(
        `Exchange ${a.getCurrency().name} -> ${target.name} is impossible`
      );
    }
    const rateNanos = this.findRate(a.getCurrency(), target, when);
    return new AmountWithCurrency({
      amountCents: Math.round((a.cents() * rateNanos) / NANOS_MULTIPLIER),
      currency: target,
    });
  }

  private findRate(from: Currency, to: Currency, when: Date) {
    const whenDay = startOfDay(when);
    const ratesHistory = this.rates[from.id][to.id];
    const rate = ratesHistory[whenDay.getTime()];
    if (rate) {
      return rate;
    }
    const allTimestamps = Object.keys(ratesHistory).map((x) => +x);
    const closestTimestamp = closestTo(when, allTimestamps);
    console.warn(`Approximating rate for ${when} with ${closestTimestamp}`);
    return ratesHistory[closestTimestamp.getTime()];
  }
}

export class StockQuotes {
  private readonly quotes: {
    [stockName: number]: {
      [epoch: number]: number;
    };
  };
  private readonly currencyByStock: {
    [stockName: number]: Currency;
  };

  public constructor(init: DBStockQuote[], currencies: Currencies) {
    this.quotes = {};
    this.currencyByStock = {};
    for (const r of init) {
      const { currencyId, ticker, exchange, value } = r;
      const stockName = `${exchange}:${ticker}`;
      this.currencyByStock[stockName] = currencies.findById(currencyId);
      const date = startOfDay(new Date(r.quoteTimestamp));
      this.quotes[stockName] ??= {};
      this.quotes[stockName][date.getTime()] = value;
    }
    for (const stockName of Object.keys(this.quotes)) {
      backfillMissingDates(this.quotes[stockName]);
    }
  }

  exchange(a: AmountWithCurrency, when: Date): AmountWithCurrency {
    const c = a.getCurrency();
    if (!c.isStock()) {
      throw new Error(`Currency ${c.name} is not stock`);
    }
    const quoteCents = this.findQuote(c.name, when);
    return new AmountWithCurrency({
      amountCents: Math.round(a.dollar() * quoteCents),
      currency: this.currencyByStock[c.name],
    });
  }

  private findQuote(name: string, when: Date) {
    const whenDay = startOfDay(when);
    const quotesForStock = this.quotes[name];
    const quote = quotesForStock[whenDay.getTime()];
    if (quote) {
      return quote;
    }
    const allTimestamps = Object.keys(quotesForStock).map((x) => +x);
    const closestTimestamp = closestTo(when, allTimestamps);
    console.warn(
      `Approximating ${name} quote for ${when} with ${closestTimestamp}`
    );
    return quotesForStock[closestTimestamp.getTime()];
  }
}

export type AllClientDataModel = {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  bankAccounts: BankAccount[];
  currencies: Currencies;
  trips: Trip[];
  tags: Tag[];
  exchange: StockAndCurrencyExchange;
};

const AllDatabaseDataContext = createContext<AllClientDataModel>(null);
export const AllDatabaseDataContextProvider = (props: {
  init: AllClientDataModel;
  children: JSX.Element | JSX.Element[];
}) => {
  return (
    <AllDatabaseDataContext.Provider value={props.init}>
      {props.children}
    </AllDatabaseDataContext.Provider>
  );
};
export const useAllDatabaseDataContext = () => {
  return useContext(AllDatabaseDataContext);
};

export const banksModelFromDatabaseData = (
  dbBanks: DBBank[],
  dbBankAccounts: DBBankAccount[],
  currencies: Currencies,
  exchange?: StockAndCurrencyExchange
): [Bank[], BankAccount[]] => {
  const banks = dbBanks.map((b) => new Bank(b, exchange));
  const bankById: {
    [id: number]: Bank;
  } = Object.fromEntries(banks.map((x) => [x.id, x]));
  const bankAccounts = dbBankAccounts.map(
    (x) => new BankAccount(x, bankById, currencies)
  );
  bankAccounts.forEach((x) => x.bank.accounts.push(x));

  banks.sort((a, b) => a.displayOrder - b.displayOrder);
  banks.forEach((b) =>
    b.accounts.sort((a, b) => a.displayOrder - b.displayOrder)
  );

  return [banks, bankAccounts];
};

export const modelFromDatabaseData = (
  dbData: AllDatabaseData
): AllClientDataModel => {
  const categories = categoryModelFromDB(dbData.dbCategories);
  const categoryById: {
    [id: number]: Category;
  } = Object.fromEntries(categories.map((c) => [c.id, c]));

  const currencies = new Currencies(dbData.dbCurrencies);
  const exchangeRates = new ExchangeRates(dbData.dbExchangeRates);
  const stockQuotes = new StockQuotes(dbData.dbStockQuotes, currencies);
  const exchange = new StockAndCurrencyExchange(exchangeRates, stockQuotes);

  const [banks, bankAccounts] = banksModelFromDatabaseData(
    dbData.dbBanks,
    dbData.dbBankAccounts,
    currencies,
    exchange
  );
  const bankAccountById: {
    [id: number]: BankAccount;
  } = Object.fromEntries(bankAccounts.map((x) => [x.id, x]));

  const transactions: Transaction[] = dbData.dbTransactions
    .map(
      (t) =>
        new Transaction(t, categoryById, bankAccountById, currencies, exchange)
    )
    .filter((x) => x.valid());

  transactions.sort(compareTransactions);
  bankAccounts.forEach((ba) => ba.transactions.sort(compareTransactions));

  const trips = dbData.dbTrips.map((x) => new Trip(x));
  const tags = dbData.dbTags.map((x) => new Tag(x));

  return {
    banks,
    bankAccounts,
    currencies,
    categories,
    trips,
    tags,
    transactions,
    exchange,
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
