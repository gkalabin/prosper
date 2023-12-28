import { Currency as DBCurrency } from "@prisma/client";

export const NANOS_MULTIPLIER = 1000000000;

const formatters = {
  // TODO: generalise
  EUR: (options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(
      "nl-NL",
      Object.assign({ style: "currency", currency: "EUR" }, options)
    ),
  RUB: (options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(
      "ru-RU",
      Object.assign({ style: "currency", currency: "RUB" }, options)
    ),
  GBP: (options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(
      "en-GB",
      Object.assign({ style: "currency", currency: "GBP" }, options)
    ),
  USD: (options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(
      "en-US",
      Object.assign({ style: "currency", currency: "USD" }, options)
    ),
};

export class Currency {
  static USD = new Currency("USD");

  private static readonly currencies = [
    new Currency("RUB"),
    Currency.USD,
    new Currency("EUR"),
    new Currency("GBP"),
  ];

  static findByCode(code: string) {
    return Currency.currencies.find((c) => c.name == code);
  }

  static all(): Currency[] {
    return [...Currency.currencies];
  }

  constructor(private readonly name: string) {}

  code() {
    return this.name;
  }

  format(amountDollar: number, options?: Intl.NumberFormatOptions) {
    const formatter = formatters[this.name](options);
    if (!formatter) {
      throw new Error(`Unknown formatter for currency ${this.name}`);
    }
    return formatter.format(amountDollar);
  }
}

/**
 * @deprecated
 */
export class CurrencyOld {
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
  format(amountDollar: number, options?: Intl.NumberFormatOptions) {
    // TODO: move stocks into a separate type
    if (this.isStock()) {
      return `${amountDollar} ${this.name}`;
    }
    const formatter = formatters[this.name](options);
    if (!formatter) {
      throw new Error(`Unknown formatter for currency ${this.name}`);
    }
    return formatter.format(amountDollar);
  }
}

/**
 * @deprecated
 */
export class Currencies {
  private readonly currencies: CurrencyOld[];
  private readonly byId: {
    [id: number]: CurrencyOld;
  };

  public constructor(init: DBCurrency[]) {
    this.currencies = init.map((x) => new CurrencyOld(x));
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
