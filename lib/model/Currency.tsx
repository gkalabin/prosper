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
