import { Currency } from "lib/model/Currency";

const formatters = {
  EUR: new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }),
  RUB: new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }),
  GBP: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
};

const formatterByCurrency = (currency: Currency) => {
  const formatter = formatters[currency.name];
  if (!formatter) {
    throw new Error(
      `Unknown formatter for currency ${JSON.stringify(currency, undefined, 2)}`
    );
  }
  return formatter;
};

export const formatMoney = (amountCents: number, currency: Currency) => {
  const realAmount = amountCents / 100;
  // TODO: move stocks into a separate type
  if (currency.name.indexOf(":") > 0) {
    return `${realAmount} ${currency.name}`;
  }
  return formatterByCurrency(currency).format(realAmount);
};
