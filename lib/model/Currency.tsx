export const NANOS_MULTIPLIER = 1000000000;

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

  static findByCode(code: string): Currency | undefined {
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

const CURRENCY_TO_LOCALE: Map<string, string> = new Map([
  // TODO: use client's locale or provide a way to override it.
  ["EUR", "nl-NL"],
  ["RUB", "ru-RU"],
  ["GBP", "en-GB"],
  ["USD", "en-US"],
  ["KZT", "kk-KZ"],
  ["CNY", "zh-CN"],
  ["JPY", "ja-JP"],
  ["KRW", "ko-KR"],
  ["HKD", "zh-HK"],
]);

export function formatCurrency(
  currency: Currency,
  amountDollar: number,
  options?: Intl.NumberFormatOptions,
) {
  const code = currency.code();
  const locale = CURRENCY_TO_LOCALE.get(code);
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    ...options,
  });
  return formatter.format(amountDollar);
}
