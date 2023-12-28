import { Currency as DBCurrency } from "@prisma/client";

export const NANOS_MULTIPLIER = 1000000000;

const formatters = {
  // TODO: generalise
  EUR: new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }),
  RUB: new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }),
  GBP: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  format(amountDollar: number) {
    // TODO: move stocks into a separate type
    if (this.isStock()) {
      return `${amountDollar} ${this.name}`;
    }
    const formatter = formatters[this.name];
    if (!formatter) {
      throw new Error(`Unknown formatter for currency ${this.name}`);
    }
    return formatter.format(amountDollar);
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
