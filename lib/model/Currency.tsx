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

  static mustFindByCode(code: string): Currency {
    const found = Currency.currencies.find((c) => c.name == code);
    if (!found) {
      throw new Error(`Cannot find currency '${code}'`);
    }
    return found;
  }

  static findByCode(code: string): Currency|undefined {
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
    return formatCurrency(this, amountDollar, options);
  }
}

export function formatCurrency(
  currency: Currency,
  amountDollar: number,
  options?: Intl.NumberFormatOptions
) {
  const code = currency.code();
  const formatter = formatters[code](options);
  if (!formatter) {
    throw new Error(`Unknown formatter for currency ${code}`);
  }
  return formatter.format(amountDollar);
}
