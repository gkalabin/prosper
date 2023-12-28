import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
  ExchangeRate as DBExchangeRate,
  StockQuote as DBStockQuote,
} from "@prisma/client";
import { closestTo, startOfDay } from "date-fns";
import { Bank, BankAccount } from "lib/model/BankAccount";
import { Category, categoryModelFromDB } from "lib/model/Category";
import { Transaction } from "lib/model/Transaction";
import { AllDatabaseData } from "lib/ServerSideDB";
import { createContext, ReactNode, useContext } from "react";

const CurrencyContext = createContext<Currencies>(null);
export const CurrencyContextProvider = (props: {
  init: DBCurrency[];
  children: ReactNode[];
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

export class Currency {
  readonly id: number;
  readonly name: string;
  readonly dbValue: DBCurrency;

  public constructor(init: DBCurrency) {
    this.dbValue = init;
    this.id = init.id;
    this.name = init.name;
  }

  isStock() {
    return this.name.indexOf(":") >= 0;
  }

  ticker() {
    if (!this.isStock()) {
      throw new Error(`Currency ${this.name} is not stock`);
    }
    const [_unused, ticker] = this.name.split(":");
    return ticker;
  }

  exchange() {
    if (!this.isStock()) {
      throw new Error(`Currency ${this.name} is not stock`);
    }
    const [exchange] = this.name.split(":");
    return exchange;
  }
}
export class Currencies {
  private readonly currencies: Currency[];
  private readonly byId: {
    [id: number]: Currency;
  };

  public constructor(init: DBCurrency[]) {
    this.currencies = init.map((x) => new Currency(x));
    this.byId = Object.fromEntries(this.currencies.map((x) => [x.id, x]));
  }

  all() {
    return this.currencies;
  }
  findById(id: number) {
    return this.byId[id];
  }
  findByName(name: string) {
    return this.currencies.find((c) => c.name == name);
  }
  empty() {
    return !this.currencies.length;
  }
}

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
      const ts = new Date(r.rateTimestamp);
      this.rates[fromId] ??= {};
      this.rates[fromId][toId] ??= {};
      this.rates[fromId][toId][ts.getTime()] = +r.rateNanos.toString();
      const start = startOfDay(ts);
      this.rates[fromId][toId][start.getTime()] = +r.rateNanos.toString();
    }
  }

  exchange(from: Currency, to: Currency, when: Date, amount: number) {
    if (from.id == to.id) {
      return amount;
    }
    if (from.isStock() || to.isStock()) {
      new Error(`Exchange ${from.name} -> ${to.name} is impossible`);
    }
    const rateNanos = this.findRate(from, to, when);
    return (amount * rateNanos) / 1000000000;
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
      const ts = new Date(r.quoteTimestamp);
      const start = startOfDay(ts);
      this.quotes[stockName] ??= {};
      this.quotes[stockName][ts.getTime()] = value;
      this.quotes[stockName][start.getTime()] = value;
    }
  }

  exchange(c: Currency, when: Date, amount: number) {
    if (!c.isStock()) {
      throw new Error(`Currency ${c.name} is not stock`);
    }
    const value = this.findQuote(c.name, when);
    return {
      amount: amount * value,
      currency: this.currencyByStock[c.name],
    };
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

export type AllDataModel = {
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  bankAccounts: BankAccount[];
  currencies: Currencies;
};

export const banksModelFromDatabaseData = (
  dbBanks: DBBank[],
  dbBankAccounts: DBBankAccount[],
  currencies: Currencies,
  exchangeRates?: ExchangeRates,
  stockQuotes?: StockQuotes
): [Bank[], BankAccount[]] => {
  const banks = dbBanks.map((b) => new Bank(b, exchangeRates, stockQuotes));
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
): AllDataModel => {
  const categories = categoryModelFromDB(dbData.dbCategories);
  const categoryById: {
    [id: number]: Category;
  } = Object.fromEntries(categories.map((c) => [c.id, c]));

  const currencies = new Currencies(dbData.dbCurrencies);
  const exchangeRates = new ExchangeRates(dbData.dbExchangeRates);
  const stockQuotes = new StockQuotes(dbData.dbStockQuotes, currencies);

  const [banks, bankAccounts] = banksModelFromDatabaseData(
    dbData.dbBanks,
    dbData.dbBankAccounts,
    currencies,
    exchangeRates,
    stockQuotes
  );
  const bankAccountById: {
    [id: number]: BankAccount;
  } = Object.fromEntries(bankAccounts.map((x) => [x.id, x]));

  const transactions: Transaction[] = dbData.dbTransactions
    .map((t) => new Transaction(t, categoryById, bankAccountById, currencies))
    .filter((x) => x.valid());

  transactions.sort(compareTransactions);
  bankAccounts.forEach((ba) => ba.transactions.sort(compareTransactions));

  return {
    banks,
    bankAccounts,
    currencies,
    categories,
    transactions,
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
