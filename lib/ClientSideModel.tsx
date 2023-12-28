import {
  Bank as DBBank,
  BankAccount as DBBankAccount,
  Currency as DBCurrency,
  ExchangeRate as DBExchangeRate,
} from "@prisma/client";
import { startOfDay } from "date-fns";
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
    const rateNanos = this.findRate(from, to, when);
    return (amount * rateNanos) / 1000000000;
  }

  private findRate(from: Currency, to: Currency, when: Date) {
    if (from.name.indexOf(":") >= 0) {
      console.warn("Not implemented yet");
      return 0;
    }
    const whenDay = startOfDay(when);
    const ratesHistory = this.rates[from.id][to.id];
    const rate = ratesHistory[whenDay.getTime()];
    if (rate) {
      return rate;
    }
    throw new Error(
      `failed to echange rate ${from.name} ${to.name} on ${when}: not found rate on ${whenDay}`
    );
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
  exchangeRates?: ExchangeRates
): [Bank[], BankAccount[]] => {
  const banks = dbBanks.map((b) => new Bank(b, exchangeRates));
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

  const [banks, bankAccounts] = banksModelFromDatabaseData(
    dbData.dbBanks,
    dbData.dbBankAccounts,
    currencies,
    exchangeRates
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
