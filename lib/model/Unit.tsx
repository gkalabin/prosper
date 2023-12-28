import { Currency } from "lib/model/Currency";
import { Stock, formatStock } from "lib/model/Stock";

export type Unit = Stock | Currency;

export function formatUnit(
  unit: Unit,
  amountDollar: number,
  options?: Intl.NumberFormatOptions
): string {
  const stock: Stock = unit as Stock;
  if (stock?.currencyCode) {
    return formatStock(stock, amountDollar, options);
  }
  const currency: Currency = unit as Currency;
  if (currency.code) {
    return currency.format(amountDollar, options);
  }
  throw new Error("Unknown unit");
}

export function isCurrency(unit: Unit): unit is Currency {
  return unit instanceof Currency;
}

export function isStock(unit: Unit): unit is Stock {
  // TODO: fix, casting is ugly.
  return !!(unit as Stock)?.ticker;
}
