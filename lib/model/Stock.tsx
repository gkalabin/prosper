import { Stock as DBStock } from "@prisma/client";
import { Currency } from "./Currency";

export class Stock {
  readonly _id: number;
  readonly _name: string;
  readonly _currencyCode: string;
  readonly _ticker: string;
  readonly _exchange: string;

  constructor(init: DBStock) {
    this._id = init.id;
    this._name = init.name;
    this._currencyCode = init.currencyCode;
    this._ticker = init.ticker;
    this._exchange = init.exchange;
  }

  id(): number {
    return this._id;
  }

  name(): string {
    return this._name;
  }

  ticker(): string {
    return this._ticker;
  }

  exchange(): string {
    return this._exchange;
  }

  currency(): Currency {
    return Currency.findByCode(this._currencyCode);
  }

  format(amountDollar: number, options?: Intl.NumberFormatOptions) {
    const amount = Intl.NumberFormat([], options).format(amountDollar);
    return `${amount} ${this._ticker}`;
  }
}
